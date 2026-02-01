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
    let media_type_str = format!("{:?}", m.media_type).to_uppercase();
    let status_str = format!("{:?}", m.status).to_uppercase();

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
  ]
}

/*
SeedMedia {
      id: 1,
      name: "Dune",
      description: "A noble family becomes embroiled in a war for control over the desert planet Arrakis and its valuable spice.",
      image_url: "assets/images/dune.jpg",
      tags: vec!["Sci-Fi", "Adventure", "Drama"],
    },
    SeedMedia {
      id: 2,
      name: "Donnie Darko",
      description: "A troubled teenager experiences disturbing visions that lead him to question time, fate, and reality.",
      image_url: "assets/images/donnie-darko.jpg",
      tags: vec!["Sci-Fi", "Psychological", "Drama"],
    },
    SeedMedia {
      id: 3,
      name: "Fight Club",
      description: "An insomniac office worker forms an underground fight club that evolves into something far more dangerous.",
      image_url: "assets/images/fight-club.jpg",
      tags: vec!["Drama", "Thriller"],
    },
    SeedMedia {
      id: 4,
      name: "Alien",
      description: "The crew of a commercial spaceship encounters a deadly extraterrestrial lifeform.",
      image_url: "assets/images/alien.jpg",
      tags: vec!["Sci-Fi", "Horror", "Thriller"],
    },
    SeedMedia {
      id: 5,
      name: "Interstellar",
      description: "A team of explorers travels through a wormhole in space to ensure humanity’s survival.",
      image_url: "assets/images/interstellar.jpg",
      tags: vec!["Sci-Fi", "Adventure", "Drama"],
    },
    SeedMedia {
      id: 6,
      name: "Everything Everywhere All at Once",
      description: "Evelyn Wang est à bout...",
      image_url: "assets/images/everything.jpg",
      tags: vec!["Comedy", "Sci-Fi", "Drama"],
    },
    SeedMedia {
      id: 7,
      name: "28 Days Later",
      description: "A virus outbreak devastates the UK...",
      image_url: "assets/images/28-days-later.jpg",
      tags: vec!["Horror", "Thriller", "Sci-Fi"],
    },
    SeedMedia {
      id: 8,
      name: "Blade Runner",
      description: "A detective hunts rogue androids in a dystopian future.",
      image_url: "assets/images/blade-runner.jpg",
      tags: vec!["Sci-Fi", "Thriller", "Drama"],
    },
    SeedMedia {
      id: 9,
      name: "District 9",
      description: "Aliens are segregated in a slum on Earth...",
      image_url: "assets/images/district-9.jpg",
      tags: vec!["Sci-Fi", "Action", "Drama"],
    },
    SeedMedia {
      id: 10,
      name: "Tenet",
      description: "A secret agent manipulates time...",
      image_url: "assets/images/tenet.jpg",
      tags: vec!["Action", "Sci-Fi", "Thriller"],
    },
    SeedMedia {
      id: 11,
      name: "Snowpiercer",
      description: "Survivors of a new ice age live on a train...",
      image_url: "assets/images/snowpiercer.jpg",
      tags: vec!["Sci-Fi", "Action", "Drama"],
    },
    SeedMedia {
      id: 12,
      name: "La La Land",
      description: "A musician and an actress fall in love...",
      image_url: "assets/images/la-la-land.jpg",
      tags: vec!["Romance", "Drama", "Musical"],
    },
    SeedMedia {
      id: 13,
      name: "My Neighbor Totoro",
      description: "Two girls discover magical forest spirits...",
      image_url: "assets/images/totoro.jpg",
      tags: vec!["Animation", "Family", "Fantasy"],
    },
    SeedMedia {
      id: 14,
      name: "Mars Express",
      description: "En l’an 2200...",
      image_url: "assets/images/mars-express.jpg",
      tags: vec!["Sci-Fi", "Adventure", "Drama"],
    },
    SeedMedia {
      id: 15,
      name: "Akira",
      description: "In post-apocalyptic Neo-Tokyo...",
      image_url: "assets/images/akira.jpg",
      tags: vec!["Animation", "Sci-Fi", "Action"],
    },
    SeedMedia {
      id: 16,
      name: "Nausicaä of the Valley of the Wind",
      description: "A princess fights to save a toxic world...",
      image_url: "assets/images/nausicaa.jpg",
      tags: vec!["Animation", "Adventure", "Fantasy"],
    },
*/