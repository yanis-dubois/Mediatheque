use std::sync::Mutex;
use rusqlite::{params, Connection, Result};
use tauri::AppHandle;
use tauri::Manager;

use crate::models::enums::{MediaType, MediaStatus};

pub struct DbState {
  pub connection: Mutex<Connection>,
}

pub fn reset_db(app: &AppHandle) -> Result<()> {
  let app_dir = app.path().app_data_dir().expect("failed to get app data dir");
  let db_path = app_dir.join("mediatheque.db");

  if db_path.exists() {
      std::fs::remove_file(db_path).expect("Failed to delete old database");
  }
  Ok(())
}

pub fn get_connection(app: &AppHandle) -> Result<Connection> {
  let app_dir = app
    .path()
    .app_data_dir()
    .expect("failed to get app data dir");

  std::fs::create_dir_all(&app_dir).ok();

  let db_path = app_dir.join("mediatheque.db");
  let connection = Connection::open(db_path)?;

  // Activate foreign key for ON DELETE CASCADE directive
  connection.execute("PRAGMA foreign_keys = ON;", [])?;

  Ok(connection)
}

pub fn setup_db(app: &AppHandle) -> Result<()> {

  // delete data base
  reset_db(app).map_err(|e| e)?; // TMP 

  // open connection with DB
  let connection = get_connection(&app)?;

  // DB init + seed
  let mut connection_wrapper = connection; 
  init_db(&mut connection_wrapper)?;

  // add test data in DB
  seed_media(&mut connection_wrapper).map_err(|e| e)?;

  // give connection to Tauri using Mutex
  app.manage(DbState {
    connection: Mutex::new(connection_wrapper),
  });

  Ok(())
}

pub fn init_db(connection: &mut Connection) -> Result<()> {

  connection.execute_batch(
    "
    -- Abstract Media

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(
          type IN ('BOOK', 'MOVIE', 'SERIES', 'VIDEO_GAME', 'TABLETOP_GAME')
      ),

      title TEXT NOT NULL,
      image_url TEXT NOT NULL,
      description TEXT NOT NULL,

      release_date TEXT NOT NULL,
      added_date TEXT NOT NULL,

      status TEXT NOT NULL CHECK(
          status IN ('TO_DISCOVER', 'IN_PROGRESS', 'FINISHED', 'DROPPED')
      ),
      favorite INTEGER NOT NULL DEFAULT 0 CHECK(favorite IN (0, 1)),
      notes TEXT NOT NULL DEFAULT ''
    );



    -- Detailed Media

    CREATE TABLE IF NOT EXISTS movie (
      media_id INTEGER PRIMARY KEY,

      duration INTEGER NOT NULL,
      serie TEXT,

      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS series (
      media_id INTEGER PRIMARY KEY,

      seasons INTEGER NOT NULL,
      episodes INTEGER NOT NULL,

      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    );



    -- Other Table

    CREATE TABLE IF NOT EXISTS person (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS genre (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );



    -- Movie Relations

    CREATE TABLE IF NOT EXISTS movie_director (
      movie_id INTEGER NOT NULL,
      director_id INTEGER NOT NULL,
      PRIMARY KEY (movie_id, director_id),
      FOREIGN KEY (movie_id) REFERENCES movie(media_id) ON DELETE CASCADE,
      FOREIGN KEY (director_id) REFERENCES person(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS movie_genre (
      movie_id INTEGER NOT NULL,
      genre_id INTEGER NOT NULL,
      PRIMARY KEY (movie_id, genre_id),
      FOREIGN KEY (movie_id) REFERENCES movie(media_id) ON DELETE CASCADE,
      FOREIGN KEY (genre_id) REFERENCES genre(id) ON DELETE CASCADE
    );



    -- Series Relations

    CREATE TABLE IF NOT EXISTS series_creator (
      series_id INTEGER NOT NULL,
      creator_id INTEGER NOT NULL,
      PRIMARY KEY (series_id, creator_id),
      FOREIGN KEY (series_id) REFERENCES series(media_id) ON DELETE CASCADE,
      FOREIGN KEY (creator_id) REFERENCES person(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS series_genre (
      series_id INTEGER NOT NULL,
      genre_id INTEGER NOT NULL,
      PRIMARY KEY (series_id, genre_id),
      FOREIGN KEY (series_id) REFERENCES series(media_id) ON DELETE CASCADE,
      FOREIGN KEY (genre_id) REFERENCES genre(id) ON DELETE CASCADE
    );
    "
  )?;

  Ok(())
}



//*************************************//
//************// SEEDING //************//
//*************************************//



struct SeedMedia<'a> {
  id: i32,
  media_type: MediaType,
  title: &'a str,
  description: &'a str,
  image_url: &'a str,
  release_date: &'a str,
  added_date: &'a str,
  status: MediaStatus,
  favorite: i32,
  notes: &'a str,

  // details
  movie_details: Option<SeedMovie<'a>>,
  series_details: Option<SeedSeries<'a>>,
}

impl<'a> Default for SeedMedia<'a> {
  fn default() -> Self {
    Self {
      id: 0,
      media_type: MediaType::Series,
      title: "Sans titre",
      description: "",
      image_url: "assets/images/placeholder.jpg",
      release_date: "2024-01-01",
      added_date: "2026-01-01",
      status: MediaStatus::ToDiscover,
      favorite: 0,
      notes: "",
      movie_details: None,
      series_details: None,
    }
  }
}

#[derive(Default)]
struct SeedMovie<'a> {
  directors: Vec<&'a str>,
  genres: Vec<&'a str>,
  serie: Option<&'a str>,
  duration: i32,
}

#[derive(Default)]
struct SeedSeries<'a> {
  creators: Vec<&'a str>,
  genres: Vec<&'a str>,
  seasons: i32,
  episodes: i32,
}

pub fn seed_media(connection: &mut Connection) -> Result<()> {
  // don't seed if not needed
  let count: i64 = connection.query_row("SELECT COUNT(*) FROM media", [], |row| row.get(0))?;
  if count > 0 {
    return Ok(());
  }

  // setup transaction for security and performance
  let tx = connection.transaction()?;

  let media_list = seed_data();

  for m in media_list {
    // conversion Enums -> String (format SCREAMING_SNAKE_CASE)
    let media_type_str = m.media_type.to_string();
    let status_str = m.status.to_string();

    // insert in parent table Media
    tx.execute(
      "INSERT INTO media (id, type, title, image_url, description, release_date, added_date, status, favorite, notes)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
      params![
        m.id,
        media_type_str,
        m.title,
        m.image_url,
        m.description,
        m.release_date,
        m.added_date,
        status_str,
        m.favorite,
        m.notes
      ],
    )?;

    // -- add detail informations

    // movies
    if let Some(details) = m.movie_details {

      // add movie
      tx.execute(
        "INSERT INTO movie (media_id, duration, serie) VALUES (?1, ?2, ?3)",
        params![m.id, details.duration, details.serie],
      )?;

      // add genre and movie_genre relation
      for genre_name in details.genres {
        tx.execute(
          "INSERT OR IGNORE INTO genre (name) VALUES (?1)",
          [genre_name],
        )?;
        tx.execute(
          "INSERT INTO movie_genre (movie_id, genre_id)
            SELECT ?1, id FROM genre WHERE name = ?2",
          params![m.id, genre_name],
        )?;
      }

      // add director and movie_director relation
      for director_name in details.directors {
        tx.execute(
          "INSERT OR IGNORE INTO person (name) VALUES (?1)",
          [director_name],
        )?;
        tx.execute(
          "INSERT INTO movie_director (movie_id, director_id)
            SELECT ?1, id FROM person WHERE name = ?2",
          params![m.id, director_name],
        )?;
      }
    }
    // series
    else if let Some(details) = m.series_details {

      // add series
      tx.execute(
        "INSERT INTO series (media_id, seasons, episodes) VALUES (?1, ?2, ?3)",
        params![m.id, details.seasons, details.episodes],
      )?;

      // add genre and series_genre relation
      for genre_name in details.genres {
        tx.execute(
          "INSERT OR IGNORE INTO genre (name) VALUES (?1)",
          [genre_name],
        )?;
        tx.execute(
          "INSERT INTO series_genre (series_id, genre_id)
            SELECT ?1, id FROM genre WHERE name = ?2",
          params![m.id, genre_name],
        )?;
      }

      // add director and series_creator relation
      for creator_name in details.creators {
        tx.execute(
          "INSERT OR IGNORE INTO person (name) VALUES (?1)",
          [creator_name],
        )?;
        tx.execute(
          "INSERT INTO series_creator (series_id, creator_id)
            SELECT ?1, id FROM person WHERE name = ?2",
          params![m.id, creator_name],
        )?;
      }
    }
  }

  // validate all operations
  tx.commit()?;
  println!("Database initialized with success !");
  Ok(())
}

fn seed_data() -> Vec<SeedMedia<'static>> {
  vec![
    SeedMedia {
      id: 1,
      media_type: MediaType::Movie,
      title: "Dune",
      description: "L'histoire de Paul Atreides...",
      image_url: "assets/images/dune.jpg",
      release_date: "2021-09-15",
      added_date: "2026-01-01",
      status: MediaStatus::Finished,
      favorite: 1,
      notes: "Ce film est incroyable !",
      movie_details: Some(SeedMovie {
        directors: vec!["Denis Villeneuve"],
        genres: vec!["Sci-Fi", "Adventure"],
        serie: Some("Dune Saga"),
        duration: 155,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 2,
      media_type: MediaType::Movie,
      title: "Donnie Darko",
      description: "A troubled teenager experiences disturbing visions that lead him to question time, fate, and reality.",
      image_url: "assets/images/donnie-darko.jpg",
      release_date: "2001-10-26",
      added_date: "2026-01-01",
      status: MediaStatus::Finished,
      favorite: 1,
      notes: "Un classique du cinéma indépendant.",
      movie_details: Some(SeedMovie {
        directors: vec!["Richard Kelly"],
        genres: vec!["Sci-Fi", "Psychological", "Drama"],
        serie: None,
        duration: 113,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 3,
      media_type: MediaType::Movie,
      title: "Fight Club",
      description: "Un employé de bureau insomniaque...",
      image_url: "assets/images/fight-club.jpg",
      release_date: "1999-10-15",
      added_date: "2026-01-05",
      status: MediaStatus::Finished,
      favorite: 1,
      notes: "Ce film est fou !",
      movie_details: Some(SeedMovie {
        directors: vec!["David Fincher"],
        genres: vec!["Drama"],
        serie: None,
        duration: 139,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 4,
      media_type: MediaType::Movie,
      title: "Alien",
      description: "The crew of a commercial spaceship encounters a deadly extraterrestrial lifeform.",
      image_url: "assets/images/alien.jpg",
      release_date: "1979-05-25",
      added_date: "2026-01-01",
      status: MediaStatus::Finished,
      favorite: 1,
      notes: "Dans l'espace, personne ne vous entend crier.",
      movie_details: Some(SeedMovie {
        directors: vec!["Ridley Scott"],
        genres: vec!["Sci-Fi", "Horror", "Thriller"],
        serie: Some("Alien Saga"),
        duration: 117,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 5,
      media_type: MediaType::Movie,
      title: "Interstellar",
      description: "A team of explorers travels through a wormhole in space to ensure humanity’s survival.",
      image_url: "assets/images/interstellar.jpg",
      release_date: "2014-11-07",
      added_date: "2026-01-01",
      status: MediaStatus::Finished,
      favorite: 1,
      notes: "Une claque visuelle et émotionnelle.",
      movie_details: Some(SeedMovie {
        directors: vec!["Christopher Nolan"],
        genres: vec!["Sci-Fi", "Adventure", "Drama"],
        serie: None,
        duration: 169,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 6,
      media_type: MediaType::Movie,
      title: "Everything Everywhere All at Once",
      description: "Evelyn Wang est à bout...",
      image_url: "assets/images/everything.jpg",
      release_date: "2022-03-25",
      added_date: "2026-01-01",
      status: MediaStatus::Finished,
      favorite: 0,
      notes: "Le multivers à son meilleur.",
      movie_details: Some(SeedMovie {
        directors: vec!["Daniel Kwan", "Daniel Scheinert"],
        genres: vec!["Comedy", "Sci-Fi", "Drama"],
        serie: None,
        duration: 139,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 7,
      media_type: MediaType::Movie,
      title: "28 Days Later",
      description: "A virus outbreak devastates the UK...",
      image_url: "assets/images/28-days-later.jpg",
      release_date: "2002-11-01",
      added_date: "2026-01-01",
      status: MediaStatus::ToDiscover,
      favorite: 0,
      notes: "",
      movie_details: Some(SeedMovie {
        directors: vec!["Danny Boyle"],
        genres: vec!["Horror", "Thriller", "Sci-Fi"],
        serie: Some("28 Days Saga"),
        duration: 113,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 8,
      media_type: MediaType::Movie,
      title: "Blade Runner",
      description: "A detective hunts rogue androids in a dystopian future.",
      image_url: "assets/images/blade-runner.jpg",
      release_date: "1982-06-25",
      added_date: "2026-01-01",
      status: MediaStatus::Finished,
      favorite: 1,
      notes: "Cyberpunk absolu.",
      movie_details: Some(SeedMovie {
        directors: vec!["Ridley Scott"],
        genres: vec!["Sci-Fi", "Thriller", "Drama"],
        serie: Some("Blade Runner Saga"),
        duration: 117,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 9,
      media_type: MediaType::Movie,
      title: "District 9",
      description: "Aliens are segregated in a slum on Earth...",
      image_url: "assets/images/district-9.jpg",
      release_date: "2009-08-14",
      added_date: "2026-01-01",
      status: MediaStatus::Finished,
      favorite: 0,
      notes: "",
      movie_details: Some(SeedMovie {
        directors: vec!["Neill Blomkamp"],
        genres: vec!["Sci-Fi", "Action", "Drama"],
        serie: None,
        duration: 112,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 10,
      media_type: MediaType::Movie,
      title: "Tenet",
      description: "A secret agent manipulates time...",
      image_url: "assets/images/tenet.jpg",
      release_date: "2020-08-26",
      added_date: "2026-01-01",
      status: MediaStatus::InProgress,
      favorite: 0,
      notes: "Besoin de deux visionnages pour comprendre.",
      movie_details: Some(SeedMovie {
        directors: vec!["Christopher Nolan"],
        genres: vec!["Action", "Sci-Fi", "Thriller"],
        serie: None,
        duration: 150,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 11,
      media_type: MediaType::Movie,
      title: "Snowpiercer",
      description: "Survivors of a new ice age live on a train...",
      image_url: "assets/images/snowpiercer.jpg",
      release_date: "2013-08-01",
      added_date: "2026-01-01",
      status: MediaStatus::Finished,
      favorite: 0,
      notes: "",
      movie_details: Some(SeedMovie {
        directors: vec!["Bong Joon-ho"],
        genres: vec!["Sci-Fi", "Action", "Drama"],
        serie: None,
        duration: 126,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 12,
      media_type: MediaType::Movie,
      title: "La La Land",
      description: "A musician and an actress fall in love...",
      image_url: "assets/images/la-la-land.jpg",
      release_date: "2016-12-09",
      added_date: "2026-01-01",
      status: MediaStatus::Dropped,
      favorite: 1,
      notes: "La scène d'ouverture est magistrale.",
      movie_details: Some(SeedMovie {
        directors: vec!["Damien Chazelle"],
        genres: vec!["Romance", "Drama", "Musical"],
        serie: None,
        duration: 128,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 13,
      media_type: MediaType::Movie,
      title: "My Neighbor Totoro",
      description: "Two girls discover magical forest spirits...",
      image_url: "assets/images/totoro.jpg",
      release_date: "1988-04-16",
      added_date: "2026-01-01",
      status: MediaStatus::Finished,
      favorite: 1,
      notes: "Poétique et intemporel.",
      movie_details: Some(SeedMovie {
        directors: vec!["Hayao Miyazaki"],
        genres: vec!["Animation", "Family", "Fantasy"],
        serie: Some("Studio Ghibli"),
        duration: 86,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 14,
      media_type: MediaType::Movie,
      title: "Mars Express",
      description: "En l’an 2200...",
      image_url: "assets/images/mars-express.jpg",
      release_date: "2023-11-22",
      added_date: "2026-01-01",
      status: MediaStatus::ToDiscover,
      favorite: 0,
      notes: "SF française de haute volée.",
      movie_details: Some(SeedMovie {
        directors: vec!["Jérémie Périn"],
        genres: vec!["Sci-Fi", "Adventure", "Drama"],
        serie: None,
        duration: 85,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 15,
      media_type: MediaType::Movie,
      title: "Akira",
      description: "In post-apocalyptic Neo-Tokyo...",
      image_url: "assets/images/akira.jpg",
      release_date: "1988-07-16",
      added_date: "2026-01-01",
      status: MediaStatus::Finished,
      favorite: 1,
      notes: "Indispensable.",
      movie_details: Some(SeedMovie {
        directors: vec!["Katsuhiro Otomo"],
        genres: vec!["Animation", "Sci-Fi", "Action"],
        serie: None,
        duration: 124,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 16,
      media_type: MediaType::Movie,
      title: "Nausicaä of the Valley of the Wind",
      description: "A princess fights to save a toxic world...",
      image_url: "assets/images/nausicaa.jpg",
      release_date: "1984-03-11",
      added_date: "2026-01-01",
      status: MediaStatus::Finished,
      favorite: 1,
      notes: "L'origine de Ghibli.",
      movie_details: Some(SeedMovie {
        directors: vec!["Hayao Miyazaki"],
        genres: vec!["Animation", "Adventure", "Fantasy"],
        serie: Some("Studio Ghibli"),
        duration: 117,
      }),
      ..Default::default()
    },





    SeedMedia {
      id: 102,
      media_type: MediaType::Series,
      title: "Lost",
      description: "Les survivants d'un crash d'avion sur une île mystérieuse.",
      image_url: "assets/images/lost.jpg",
      status: MediaStatus::Finished,
      series_details: Some(SeedSeries {
        creators: vec!["J.J. Abrams", "Damon Lindelof"],
        genres: vec!["Aventure", "Drame", "Mystère"],
        seasons: 6,
        episodes: 121,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 103,
      media_type: MediaType::Series,
      title: "Silo",
      description: "Dans un futur toxique, une communauté vit dans un silo géant souterrain.",
      image_url: "assets/images/silo.jpg",
      series_details: Some(SeedSeries {
        creators: vec!["Graham Yost"],
        genres: vec!["Sci-Fi", "Dystopie"],
        seasons: 1,
        episodes: 10,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 104,
      media_type: MediaType::Series,
      title: "The OA",
      description: "Une jeune femme aveugle réapparaît après 7 ans avec la vue retrouvée.",
      image_url: "assets/images/oa.jpg",
      series_details: Some(SeedSeries {
        creators: vec!["Brit Marling", "Zal Batmanglij"],
        genres: vec!["Fantastique", "Mystère"],
        seasons: 2,
        episodes: 16,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 105,
      media_type: MediaType::Series,
      title: "Love, Death + Robots",
      description: "Anthologie de courts-métrages d'animation de genres variés.",
      image_url: "assets/images/love-death-robots.jpg",
      series_details: Some(SeedSeries {
        creators: vec!["Tim Miller", "David Fincher"],
        genres: vec!["Animation", "Sci-Fi", "Horreur"],
        seasons: 3,
        episodes: 35,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 106,
      media_type: MediaType::Series,
      title: "Scavengers Reign",
      description: "L'équipage d'un cargo spatial tente de survivre sur une planète alien magnifique mais mortelle.",
      image_url: "assets/images/scavengers.jpg",
      series_details: Some(SeedSeries {
        creators: vec!["Joseph Bennett", "Charles Huettner"],
        genres: vec!["Animation", "Sci-Fi", "Survie"],
        seasons: 1,
        episodes: 12,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 107,
      media_type: MediaType::Series,
      title: "Bee and PuppyCat",
      description: "Une jeune femme au chômage rencontre une créature mystérieuse tombée du ciel.",
      image_url: "assets/images/puppycat.jpg",
      series_details: Some(SeedSeries {
        creators: vec!["Natasha Allegri"],
        genres: vec!["Animation", "Fantasy", "Tranche de vie"],
        seasons: 2,
        episodes: 26,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 108,
      media_type: MediaType::Series,
      title: "Cowboy Bebop",
      description: "Les aventures d'un groupe de chasseurs de primes dans l'espace en 2071.",
      image_url: "assets/images/bebop.jpg",
      series_details: Some(SeedSeries {
        creators: vec!["Shin'ichirō Watanabe"],
        genres: vec!["Animation", "Space Western", "Neo-noir"],
        seasons: 1,
        episodes: 26,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 109,
      media_type: MediaType::Series,
      title: "Neon Genesis Evangelion",
      description: "Des adolescents pilotent des géants organiques pour protéger l'humanité contre les Anges.",
      image_url: "assets/images/evangelion.jpg",
      series_details: Some(SeedSeries {
        creators: vec!["Hideaki Anno"],
        genres: vec!["Animation", "Mecha", "Psychologique"],
        seasons: 1,
        episodes: 26,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 110,
      media_type: MediaType::Series,
      title: "Death Note",
      description: "Un lycéen trouve un carnet capable de tuer toute personne dont on y écrit le nom.",
      image_url: "assets/images/death-note.jpg",
      series_details: Some(SeedSeries {
        creators: vec!["Tsugumi Ōba"],
        genres: vec!["Animation", "Thriller", "Surnaturel"],
        seasons: 1,
        episodes: 37,
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 111,
      media_type: MediaType::Series,
      title: "The Promised Neverland",
      description: "Des orphelins découvrent le terrible secret caché derrière leur existence paisible.",
      image_url: "assets/images/neverland.jpg",
      series_details: Some(SeedSeries {
        creators: vec!["Kaiu Shirai"],
        genres: vec!["Animation", "Mystère", "Horreur"],
        seasons: 2,
        episodes: 23,
      }),
      ..Default::default()
    },
  ]
}
