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
          type IN ('BOOK', 'MOVIE', 'TV_SHOW', 'VIDEO_GAME', 'TABLETOP_GAME')
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



    -- Movie Relations

    CREATE TABLE IF NOT EXISTS director (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS movie_director (
      movie_id INTEGER NOT NULL,
      director_id INTEGER NOT NULL,
      PRIMARY KEY (movie_id, director_id),
      FOREIGN KEY (movie_id) REFERENCES movie(media_id) ON DELETE CASCADE,
      FOREIGN KEY (director_id) REFERENCES director(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS genre (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS movie_genre (
      movie_id INTEGER NOT NULL,
      genre_id INTEGER NOT NULL,
      PRIMARY KEY (movie_id, genre_id),
      FOREIGN KEY (movie_id) REFERENCES movie(media_id) ON DELETE CASCADE,
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
}

struct SeedMovie<'a> {
  directors: Vec<&'a str>,
  genres: Vec<&'a str>,
  serie: Option<&'a str>,
  duration: i32,
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

    // for movies
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
          "INSERT OR IGNORE INTO director (name) VALUES (?1)",
          [director_name],
        )?;
        tx.execute(
          "INSERT INTO movie_director (movie_id, director_id)
            SELECT ?1, id FROM director WHERE name = ?2",
          params![m.id, director_name],
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
    },
    SeedMedia {
      id: 12,
      media_type: MediaType::Movie,
      title: "La La Land",
      description: "A musician and an actress fall in love...",
      image_url: "assets/images/la-la-land.jpg",
      release_date: "2016-12-09",
      added_date: "2026-01-01",
      status: MediaStatus::Finished,
      favorite: 1,
      notes: "La scène d'ouverture est magistrale.",
      movie_details: Some(SeedMovie {
        directors: vec!["Damien Chazelle"],
        genres: vec!["Romance", "Drama", "Musical"],
        serie: None,
        duration: 128,
      }),
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
    },
  ]
}
