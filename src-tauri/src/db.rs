use std::sync::Mutex;
use rusqlite::{params, Connection, Result};
use tauri::AppHandle;
use tauri::Manager;

use crate::models::enums::CollectionMediaType;
use crate::models::enums::CollectionType;
use crate::models::enums::CollectionView;
use crate::models::enums::MediaOrderDirection;
use crate::models::enums::MediaOrderField;
use crate::models::enums::{MediaType, MediaStatus};
use crate::models::query::MediaFilter;
use crate::models::query::MediaOrder;

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

  // activate the ON DELETE CASCADE directive
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
  seed_data(&mut connection_wrapper).map_err(|e| e)?;

  // give connection to Tauri using Mutex
  app.manage(DbState {
    connection: Mutex::new(connection_wrapper),
  });

  Ok(())
}

pub fn init_db(connection: &mut Connection) -> Result<()> {

  connection.execute_batch(
    "
    -- Collection

    CREATE TABLE collection (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,

      type TEXT NOT NULL CHECK(
        type IN ('MANUAL', 'DYNAMIC')
      ),
      media_type TEXT NOT NULL CHECK(
        media_type IN ('ALL', 'BOOK', 'MOVIE', 'SERIES', 'VIDEO_GAME', 'TABLETOP_GAME')
      ),

      added_date TEXT NOT NULL,

      favorite INTEGER NOT NULL DEFAULT 0 CHECK(favorite IN (0, 1)),
      description TEXT NOT NULL DEFAULT '',

      sort_order TEXT, -- in JSON, ex: [{field: 'favorite', direction: 'DESC'}, {field: 'status', direction: 'ASC'}]
      preferred_view TEXT CHECK(
        preferred_view IN ('GRID', 'ROW', 'COLUMN')
      ) DEFAULT 'GRID',

      has_image INTEGER NOT NULL DEFAULT 0 CHECK(has_image IN (0, 1))
    );

    -- Specific Collection
  
    -- Manual Collection
    CREATE TABLE collection_media (
      collection_id TEXT NOT NULL,
      media_id TEXT NOT NULL,
      position INTEGER, -- allow personnalised order

      PRIMARY KEY (collection_id, media_id),
      FOREIGN KEY (collection_id) REFERENCES collection(id) ON DELETE CASCADE,
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    );

    -- Dynamic Collection
    CREATE TABLE collection_dynamic_filter (
      collection_id TEXT PRIMARY KEY,
      filter TEXT, -- in JSON, ex: [{media_type: 'MOVIE'}, {favorite: 'true'}]

      FOREIGN KEY (collection_id) REFERENCES collection(id) ON DELETE CASCADE
    );



    -- Abstract Media

    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL CHECK(
          type IN ('BOOK', 'MOVIE', 'SERIES', 'VIDEO_GAME', 'TABLETOP_GAME')
      ),

      image_width INTEGER NOT NULL,
      image_height INTEGER NOT NULL,

      title TEXT NOT NULL,
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
      media_id TEXT PRIMARY KEY,

      duration INTEGER NOT NULL,
      serie TEXT,

      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS series (
      media_id TEXT PRIMARY KEY,

      seasons INTEGER NOT NULL,
      episodes INTEGER NOT NULL,

      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tabletop_game (
      media_id TEXT PRIMARY KEY,

      player_count TEXT NOT NULL,
      playing_time TEXT NOT NULL,

      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    );



    -- Other Table

    CREATE TABLE IF NOT EXISTS person (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS company (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS genre (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS game_mechanic (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );



    -- Movie Relations

    CREATE TABLE IF NOT EXISTS movie_director (
      movie_id TEXT NOT NULL,
      director_id INTEGER NOT NULL,
      PRIMARY KEY (movie_id, director_id),
      FOREIGN KEY (movie_id) REFERENCES movie(media_id) ON DELETE CASCADE,
      FOREIGN KEY (director_id) REFERENCES person(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS movie_genre (
      movie_id TEXT NOT NULL,
      genre_id INTEGER NOT NULL,
      PRIMARY KEY (movie_id, genre_id),
      FOREIGN KEY (movie_id) REFERENCES movie(media_id) ON DELETE CASCADE,
      FOREIGN KEY (genre_id) REFERENCES genre(id) ON DELETE CASCADE
    );

    -- Series Relations

    CREATE TABLE IF NOT EXISTS series_creator (
      series_id TEXT NOT NULL,
      creator_id INTEGER NOT NULL,
      PRIMARY KEY (series_id, creator_id),
      FOREIGN KEY (series_id) REFERENCES series(media_id) ON DELETE CASCADE,
      FOREIGN KEY (creator_id) REFERENCES person(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS series_genre (
      series_id TEXT NOT NULL,
      genre_id INTEGER NOT NULL,
      PRIMARY KEY (series_id, genre_id),
      FOREIGN KEY (series_id) REFERENCES series(media_id) ON DELETE CASCADE,
      FOREIGN KEY (genre_id) REFERENCES genre(id) ON DELETE CASCADE
    );

    -- Tabletop Game Relations

    CREATE TABLE IF NOT EXISTS tabletop_game_designer (
      tabletop_game_id TEXT NOT NULL,
      designer_id INTEGER NOT NULL,
      PRIMARY KEY (tabletop_game_id, designer_id),
      FOREIGN KEY (tabletop_game_id) REFERENCES tabletop_game(media_id) ON DELETE CASCADE,
      FOREIGN KEY (designer_id) REFERENCES person(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tabletop_game_artist (
      tabletop_game_id TEXT NOT NULL,
      artist_id INTEGER NOT NULL,
      PRIMARY KEY (tabletop_game_id, artist_id),
      FOREIGN KEY (tabletop_game_id) REFERENCES tabletop_game(media_id) ON DELETE CASCADE,
      FOREIGN KEY (artist_id) REFERENCES person(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tabletop_game_publisher (
      tabletop_game_id TEXT NOT NULL,
      publisher_id INTEGER NOT NULL,
      PRIMARY KEY (tabletop_game_id, publisher_id),
      FOREIGN KEY (tabletop_game_id) REFERENCES tabletop_game(media_id) ON DELETE CASCADE,
      FOREIGN KEY (publisher_id) REFERENCES company(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tabletop_game_game_mechanic (
      tabletop_game_id TEXT NOT NULL,
      game_mechanic_id INTEGER NOT NULL,
      PRIMARY KEY (tabletop_game_id, game_mechanic_id),
      FOREIGN KEY (tabletop_game_id) REFERENCES tabletop_game(media_id) ON DELETE CASCADE,
      FOREIGN KEY (game_mechanic_id) REFERENCES game_mechanic(id) ON DELETE CASCADE
    );



    -- Media Index

    CREATE INDEX IF NOT EXISTS idx_media_title ON media(title);
    CREATE INDEX IF NOT EXISTS idx_media_release_date ON media(release_date);
    CREATE INDEX IF NOT EXISTS idx_media_added_date ON media(added_date);
    CREATE INDEX IF NOT EXISTS idx_media_status ON media(status);
    CREATE INDEX IF NOT EXISTS idx_media_favorite ON media(favorite);

    -- Relation Index (for revert search)

    CREATE INDEX IF NOT EXISTS idx_movie_director_reverse ON movie_director(director_id);
    CREATE INDEX IF NOT EXISTS idx_movie_genre_reverse ON movie_genre(genre_id);

    CREATE INDEX IF NOT EXISTS idx_series_creator_reverse ON series_creator(creator_id);
    CREATE INDEX IF NOT EXISTS idx_series_genre_reverse ON series_genre(genre_id);

    CREATE INDEX IF NOT EXISTS idx_tabletop_game_designer_reverse ON tabletop_game_designer(designer_id);
    CREATE INDEX IF NOT EXISTS idx_tabletop_game_artist_reverse ON tabletop_game_artist(artist_id);
    CREATE INDEX IF NOT EXISTS idx_tabletop_game_publisher_reverse ON tabletop_game_publisher(publisher_id);
    CREATE INDEX IF NOT EXISTS idx_tabletop_game_game_mechanic_reverse ON tabletop_game_game_mechanic(game_mechanic_id);
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
  image_width: u32,
  image_height: u32,
  release_date: &'a str,
  added_date: &'a str,
  status: MediaStatus,
  favorite: i32,
  notes: &'a str,

  // details
  movie_details: Option<SeedMovie<'a>>,
  series_details: Option<SeedSeries<'a>>,
  tabletop_game_details: Option<SeedTabletopGame<'a>>,
}

impl<'a> Default for SeedMedia<'a> {
  fn default() -> Self {
    Self {
      id: 0,
      media_type: MediaType::Series,
      title: "Sans titre",
      description: "",
      image_width: 1280,
      image_height: 1920,
      release_date: "2024-01-01",
      added_date: "2026-01-01",
      status: MediaStatus::ToDiscover,
      favorite: 0,
      notes: "",
      movie_details: None,
      series_details: None,
      tabletop_game_details: None,
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

#[derive(Default)]
struct SeedTabletopGame<'a> {
  designers: Vec<&'a str>,
  artists: Vec<&'a str>,
  publishers: Vec<&'a str>,
  game_mechanics: Vec<&'a str>,
  player_count: &'a str,
  playing_time: &'a str,
}

/* --------------------------- */

struct SeedCollection<'a> {
  id: i32,
  name: &'a str,
  collection_type: CollectionType,
  media_type: CollectionMediaType,
  added_date: &'a str,
  favorite: i32,
  description: &'a str,
  sort_order: Vec<MediaOrder>,
  prefered_view: CollectionView,
  has_image: i32,

  // details
  collection_manual: Option<SeedCollectionManual>,
  collection_dynamic: Option<SeedCollectionDynamic>,
}

impl<'a> Default for SeedCollection<'a> {
  fn default() -> Self {
    Self {
      id: 0,
      name: "Sans titre",
      collection_type: CollectionType::Manual,
      media_type: CollectionMediaType::All,
      added_date: "2026-01-01",
      favorite: 0,
      description: "",
      sort_order: vec![],
      prefered_view: CollectionView::Grid,
      has_image: 0,
      collection_manual: None,
      collection_dynamic: None,
    }
  }
}

#[derive(Default)]
struct SeedCollectionManual {
  media_ids: Vec<i32>,
}

#[derive(Default)]
struct SeedCollectionDynamic {
  filter: Option<MediaFilter>,
}

/* --------------------------- */

pub fn seed_data(connection: &mut Connection) -> Result<()> {
  // don't seed if not needed
  let count: i64 = connection.query_row("SELECT COUNT(*) FROM media", [], |row| row.get(0))?;
  if count > 0 {
    return Ok(());
  }

  // setup transaction for security and performance
  let tx = connection.transaction()?;

  let media_list = seed_media();

  for m in media_list {
    // conversion Enums -> String (format SCREAMING_SNAKE_CASE)
    let media_type_str = m.media_type.to_string();
    let status_str = m.status.to_string();

    // insert in parent table Media
    tx.execute(
      "INSERT INTO media (id, type, image_width, image_height, title, description, release_date, added_date, status, favorite, notes)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
      params![
        m.id.to_string(),
        media_type_str,
        m.image_width,
        m.image_height,
        m.title,
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
        params![m.id.to_string(), details.duration, details.serie],
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
          params![m.id.to_string(), genre_name],
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
          params![m.id.to_string(), director_name],
        )?;
      }
    }
    // series
    else if let Some(details) = m.series_details {

      // add series
      tx.execute(
        "INSERT INTO series (media_id, seasons, episodes) VALUES (?1, ?2, ?3)",
        params![m.id.to_string(), details.seasons, details.episodes],
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
          params![m.id.to_string(), genre_name],
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
          params![m.id.to_string(), creator_name],
        )?;
      }
    }
    // tabletop game
    else if let Some(details) = m.tabletop_game_details {

      // add game
      tx.execute(
        "INSERT INTO tabletop_game (media_id, player_count, playing_time) VALUES (?1, ?2, ?3)",
        params![m.id.to_string(), details.player_count, details.playing_time],
      )?;

      // add designers
      for designer_name in details.designers {
        tx.execute(
          "INSERT OR IGNORE INTO person (name) VALUES (?1)",
          [designer_name],
        )?;
        tx.execute(
          "INSERT INTO tabletop_game_designer (tabletop_game_id, designer_id)
          SELECT ?1, id FROM person WHERE name = ?2",
          params![m.id.to_string(), designer_name],
        )?;
      }

      // add artists
      for artist_name in details.artists {
        tx.execute(
          "INSERT OR IGNORE INTO person (name) VALUES (?1)",
          [artist_name],
        )?;
        tx.execute(
          "INSERT INTO tabletop_game_artist (tabletop_game_id, artist_id)
          SELECT ?1, id FROM person WHERE name = ?2",
          params![m.id.to_string(), artist_name],
        )?;
      }

      // add publishers
      for publisher_name in details.publishers {
        tx.execute(
          "INSERT OR IGNORE INTO company (name) VALUES (?1)",
          [publisher_name],
        )?;
        tx.execute(
          "INSERT INTO tabletop_game_publisher (tabletop_game_id, publisher_id)
          SELECT ?1, id FROM company WHERE name = ?2",
          params![m.id.to_string(), publisher_name],
        )?;
      }

      // add mechanics
      for mechanic_name in details.game_mechanics {
        tx.execute(
          "INSERT OR IGNORE INTO game_mechanic (name) VALUES (?1)",
          [mechanic_name],
        )?;
        tx.execute(
          "INSERT INTO tabletop_game_game_mechanic (tabletop_game_id, game_mechanic_id)
          SELECT ?1, id FROM game_mechanic WHERE name = ?2",
          params![m.id.to_string(), mechanic_name],
        )?;
      }
    }
  }



  /* ****************************** */



  let collection_list = seed_collection();

  for c in collection_list {
    // enum -> string
    let collection_type_str = c.collection_type.to_string();
    let media_type_str = c.media_type.to_string();
    let view_str = c.prefered_view.to_string();

    // Vec<MediaOrder> -> JSON
    let sort_order_json = serde_json::to_string(&c.sort_order)
        .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

    // insert in parent table Collection
    tx.execute(
      "INSERT INTO collection (id, name, type, media_type, added_date, favorite, description, sort_order, preferred_view, has_image)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
      params![
        c.id.to_string(),
        c.name,
        collection_type_str,
        media_type_str,
        c.added_date,
        c.favorite,
        c.description,
        sort_order_json,
        view_str,
        c.has_image,
      ],
    )?;

    // insert details

    // static collection
    if let Some(manual) = c.collection_manual {
      for (pos, m_id) in manual.media_ids.iter().enumerate() {
        tx.execute(
          "INSERT INTO collection_media (collection_id, media_id, position)
           VALUES (?1, ?2, ?3)",
          params![c.id.to_string(), m_id.to_string(), pos as i32],
        )?;
      }
    }

    // dynamic collection
    else if let Some(dynamic) = c.collection_dynamic {
      if let Some(filter_obj) = dynamic.filter {
        // MediaFilter -> JSON
        let filter_json = serde_json::to_string(&filter_obj)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

        tx.execute(
          "INSERT INTO collection_dynamic_filter (collection_id, filter)
           VALUES (?1, ?2)",
          params![c.id.to_string(), filter_json],
        )?;
      }
    }
  }

  // validate all operations
  tx.commit()?;
  println!("Database initialized with success !");
  Ok(())
}

fn seed_media() -> Vec<SeedMedia<'static>> {
  vec![
    SeedMedia {
      id: 1,
      media_type: MediaType::Movie,
      title: "Dune",
      description: "L'histoire de Paul Atreides...",
      release_date: "2021-09-15",
      added_date: "2026-02-01",
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
      release_date: "1982-06-25",
      added_date: "2026-02-02",
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
      release_date: "2009-08-14",
      added_date: "2026-02-03",
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
      release_date: "1988-04-16",
      added_date: "2026-01-29",
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
      release_date: "1988-07-16",
      added_date: "2026-03-01",
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
      id: 17,
      media_type: MediaType::Movie,
      title: "Dune",
      description: "En l'an 10191, la substance la plus importante est l'Épice. Elle ne se trouve que sur une seule planète, Arakis, connue aussi sous le nom de Dune. La famille Atréide vient à gouverner cette planète mais son ennemi, la dynastie des Harkonnen lui tend un piège dès son arrivée. Paul, le fils du Duc Leto Atréide se réfugie alors dans le désert avec sa mère et y rencontre les Fremens, peuple caché dans le désert attendant l'arrivée d'un Messie",
      release_date: "1984-03-11",
      added_date: "2026-01-25",
      status: MediaStatus::Finished,
      favorite: 0,
      notes: "Tellement kitch ",
      movie_details: Some(SeedMovie {
        directors: vec!["David Lynch"],
        genres: vec!["Action", "Adventure", "Sci-Fi"],
        serie: None,
        duration: 117,
      }),
      ..Default::default()
    },





    SeedMedia {
      id: 102,
      media_type: MediaType::Series,
      title: "Lost",
      description: "Les survivants d'un crash d'avion sur une île mystérieuse.",
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
      series_details: Some(SeedSeries {
        creators: vec!["Kaiu Shirai"],
        genres: vec!["Animation", "Mystère", "Horreur"],
        seasons: 2,
        episodes: 23,
      }),
      ..Default::default()
    },





    // 1. 7 Wonders Duel
    SeedMedia {
      id: 201,
      media_type: MediaType::TabletopGame,
      image_width: 601,
      image_height: 600,
      title: "7 Wonders Duel",
      description: "Le meilleur jeu pour deux joueurs où vous bâtissez une civilisation et ses merveilles.",
      tabletop_game_details: Some(SeedTabletopGame {
          designers: vec!["Antoine Bauza", "Bruno Cathala"],
          artists: vec!["Miguel Coimbra"],
          publishers: vec!["Repos Production"],
          game_mechanics: vec!["Draft", "Gestion de ressources", "Développement"],
          player_count: "2",
          playing_time: "30 min",
      }),
      ..Default::default()
    },
    // 2. Carcassonne
    SeedMedia {
      id: 202,
      media_type: MediaType::TabletopGame,
      image_width: 415,
      image_height: 600,
      title: "Carcassonne",
      description: "Placez vos tuiles et vos partisans pour contrôler cités, routes et monastères.",
      tabletop_game_details: Some(SeedTabletopGame {
          designers: vec!["Klaus-Jürgen Wrede"],
          artists: vec!["Anne Pätzke", "Chris Quilliams"],
          publishers: vec!["Hans im Glück"],
          game_mechanics: vec!["Pose de tuiles", "Majorité"],
          player_count: "2-5",
          playing_time: "35 min",
      }),
      ..Default::default()
    },
    // 3. Dune Impérium
    SeedMedia {
      id: 203,
      media_type: MediaType::TabletopGame,
      image_width: 600,
      image_height: 600,
      title: "Dune Impérium",
      description: "Mélange subtil de deck-building et de placement d'ouvriers dans l'univers de Frank Herbert.",
      tabletop_game_details: Some(SeedTabletopGame {
          designers: vec!["Paul Dennen"],
          artists: vec!["Clay Brooks", "Nate Storm"],
          publishers: vec!["Dire Wolf"],
          game_mechanics: vec!["Deck-building", "Placement d'ouvriers", "Combat"],
          player_count: "1-4",
          playing_time: "60-120 min",
      }),
      ..Default::default()
    },
    // 4. Écosystème: Forêt
    SeedMedia {
      id: 204,
      media_type: MediaType::TabletopGame,
      image_width: 720,
      image_height: 954,
      title: "Écosystème: Forêt",
      description: "Créez votre propre milieu naturel en plaçant judicieusement vos cartes animaux et habitats.",
      tabletop_game_details: Some(SeedTabletopGame {
          designers: vec!["Matt Simpson"],
          artists: vec!["Lindsay Rapp"],
          publishers: vec!["Casasola Games"],
          game_mechanics: vec!["Draft de cartes", "Placement", "Combinaison"],
          player_count: "1-6",
          playing_time: "15-20 min",
      }),
      ..Default::default()
    },
    // 5. Écosystème: Savane
    SeedMedia {
      id: 205,
      media_type: MediaType::TabletopGame,
      image_width: 573,
      image_height: 750,
      title: "Écosystème: Savane",
      description: "La suite d'Écosystème transposée dans les plaines d'Afrique avec de nouvelles chaînes alimentaires.",
      tabletop_game_details: Some(SeedTabletopGame {
          designers: vec!["Matt Simpson"],
          artists: vec!["Lindsay Rapp"],
          publishers: vec!["Casasola Games"],
          game_mechanics: vec!["Draft de cartes", "Placement", "Combinaison"],
          player_count: "1-6",
          playing_time: "15-20 min",
      }),
      ..Default::default()
    },
    // 6. Harmonies
    SeedMedia {
      id: 206,
      media_type: MediaType::TabletopGame,
      image_width: 1200,
      image_height: 1200,
      title: "Harmonies",
      favorite: 1,
      description: "Un jeu poétique où vous construisez des paysages pour accueillir des animaux sauvages.",
      tabletop_game_details: Some(SeedTabletopGame {
          designers: vec!["Johan Benvenuto"],
          artists: vec!["Maëva Da Silva"],
          publishers: vec!["Libellud"],
          game_mechanics: vec!["Draft", "Placement de jetons", "Objectifs"],
          player_count: "1-4",
          playing_time: "30-45 min",
      }),
      ..Default::default()
    },
    // 7. Not Alone
    SeedMedia {
      id: 207,
      media_type: MediaType::TabletopGame,
      image_width: 437,
      image_height: 600,
      title: "Not Alone",
      favorite: 1,
      description: "Un jeu asymétrique où un monstre traque un groupe d'explorateurs sur une planète hostile.",
      tabletop_game_details: Some(SeedTabletopGame {
          designers: vec!["Ghislain Masson"],
          artists: vec!["Sébastien Caiveau"],
          publishers: vec!["Geek Attitude Games"],
          game_mechanics: vec!["Gestion de main", "Deduction", "Bluff"],
          player_count: "2-7",
          playing_time: "30-45 min",
      }),
      ..Default::default()
    },
    // 8. Spicy
    SeedMedia {
      id: 208,
      media_type: MediaType::TabletopGame,
      image_width: 426,
      image_height: 600,
      title: "Spicy",
      description: "Un jeu de cartes et de bluff épicé avec des chats amateurs de piment.",
      tabletop_game_details: Some(SeedTabletopGame {
          designers: vec!["Győri Zoltán Gábor"],
          artists: vec!["Jimin May"],
          publishers: vec!["HeidelBÄR Games"],
          game_mechanics: vec!["Bluff", "Défausse"],
          player_count: "2-6",
          playing_time: "15-20 min",
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 209,
      media_type: MediaType::TabletopGame,
      image_width: 1539,
      image_height: 1200,
      title: "Root",
      description: "Root is a game of adventure and war in which 2 to 4 (1 to 6 with the 'Riverfolk' expansion, 2-6 with the 'Underworld', or 'Marauder' expansions) players battle for control of a vast wilderness. Like Vast: The Crystal Caverns, each player in Root has unique capabilities and a different victory condition.",
      tabletop_game_details: Some(SeedTabletopGame {
          designers: vec!["Cole Wehrle"],
          artists: vec!["Kyle Ferrin"],
          publishers: vec!["Leder Games"],
          game_mechanics: vec!["Strategy", "Wargames"],
          player_count: "2-4",
          playing_time: "60-90 min",
      }),
      ..Default::default()
    },
    SeedMedia {
      id: 210,
      media_type: MediaType::TabletopGame,
      image_width: 1714,
      image_height: 1200,
      title: "Root",
      description: "In SETI: Search for Extraterrestrial Intelligence, you lead a scientific institution tasked with searching for traces of life beyond planet Earth. The game draws inspiration from current or emerging technologies and efforts in space exploration.Players will explore nearby planets and their moons by launching probes from Earth while taking advantage of ever-shifting planetary positions. Decide whether to land on their surface to collect valuable samples, or stay in orbit for a broader survey.",
      tabletop_game_details: Some(SeedTabletopGame {
          designers: vec!["Tomáš Holek"],
          artists: vec!["Ondřej Hrdina", "Oto Kandera", "Jiří Kůs", "Jakub Lang"],
          publishers: vec!["Czech Games Edition"],
          game_mechanics: vec!["Strategy"],
          player_count: "1-4",
          playing_time: "40-160 min",
      }),
      ..Default::default()
    }
  ]
}

fn seed_collection() -> Vec<SeedCollection<'static>> {
  vec![
    SeedCollection { 
      id: 0, 
      name: "Favorite", 
      collection_type: CollectionType::Dynamic, 
      prefered_view: CollectionView::Row, 
      collection_dynamic: Some(SeedCollectionDynamic { 
        filter: Some(MediaFilter {
          favorite_only: Some(true), 
          media_type: None, 
          status: None, 
          search_query: None 
        })
      }),
      ..Default::default()
    },
    SeedCollection { 
      id: 1, 
      name: "Recent", 
      collection_type: CollectionType::Dynamic, 
      prefered_view: CollectionView::Row, 
      sort_order: vec![
        MediaOrder { field: MediaOrderField::AddedDate, direction: MediaOrderDirection::Desc }
      ],
      collection_dynamic: Some(SeedCollectionDynamic { 
        filter: None
      }),
      ..Default::default()
    },
    SeedCollection { 
      id: 2, 
      name: "Movie", 
      collection_type: CollectionType::Dynamic, 
      prefered_view: CollectionView::Grid, 
      collection_dynamic: Some(SeedCollectionDynamic { 
        filter: Some(MediaFilter {
          favorite_only: None, 
          media_type: Some(MediaType::Movie), 
          status: None, 
          search_query: None 
        })
      }),
      ..Default::default()
    },
    SeedCollection { 
      id: 3, 
      name: "Series", 
      collection_type: CollectionType::Dynamic, 
      prefered_view: CollectionView::Grid, 
      collection_dynamic: Some(SeedCollectionDynamic { 
        filter: Some(MediaFilter {
          favorite_only: None, 
          media_type: Some(MediaType::Series), 
          status: None, 
          search_query: None 
        })
      }),
      ..Default::default()
    },
    SeedCollection { 
      id: 4, 
      name: "Tabletop Game", 
      collection_type: CollectionType::Dynamic, 
      prefered_view: CollectionView::Grid, 
      collection_dynamic: Some(SeedCollectionDynamic { 
        filter: Some(MediaFilter {
          favorite_only: None, 
          media_type: Some(MediaType::TabletopGame), 
          status: None, 
          search_query: None 
        })
      }),
      ..Default::default()
    },
    SeedCollection { 
      id: 5, 
      name: "To Discover", 
      collection_type: CollectionType::Dynamic, 
      prefered_view: CollectionView::Row, 
      collection_dynamic: Some(SeedCollectionDynamic { 
        filter: Some(MediaFilter {
          favorite_only: None, 
          media_type: None, 
          status: Some(MediaStatus::ToDiscover), 
          search_query: None 
        })
      }),
      ..Default::default()
    },
    SeedCollection { 
      id: 6, 
      name: "Dune", 
      collection_type: CollectionType::Dynamic, 
      prefered_view: CollectionView::Row, 
      collection_dynamic: Some(SeedCollectionDynamic { 
        filter: Some(MediaFilter {
          favorite_only: None, 
          media_type: None, 
          status: None, 
          search_query: Some("Dune".to_string()) 
        })
      }),
      ..Default::default()
    },
    SeedCollection { 
      id: 7, 
      name: "Finished", 
      collection_type: CollectionType::Dynamic, 
      prefered_view: CollectionView::Column, 
      collection_dynamic: Some(SeedCollectionDynamic { 
        filter: Some(MediaFilter {
          favorite_only: None, 
          media_type: None, 
          status: Some(MediaStatus::Finished), 
          search_query: None
        })
      }),
      ..Default::default()
    },
    SeedCollection { 
      id: 8, 
      name: "Finished Movie with 'A'", 
      collection_type: CollectionType::Dynamic, 
      prefered_view: CollectionView::Column, 
      collection_dynamic: Some(SeedCollectionDynamic { 
        filter: Some(MediaFilter {
          favorite_only: None, 
          media_type: Some(MediaType::Movie), 
          status: Some(MediaStatus::Finished), 
          search_query: Some("A".to_string()) 
        })
      }),
      ..Default::default()
    },
    SeedCollection { 
      id: 10, 
      name: "All Media", 
      collection_type: CollectionType::Dynamic, 
      prefered_view: CollectionView::Row, 
      collection_dynamic: Some(SeedCollectionDynamic { 
        filter: None
      }),
      ..Default::default()
    },



    SeedCollection { 
      id: 100, 
      name: "My Collection", 
      collection_type: CollectionType::Manual, 
      prefered_view: CollectionView::Row, 
      collection_manual: Some(SeedCollectionManual {
        media_ids: vec![1, 4, 16, 102, 201]
      }),
      ..Default::default()
    },
  ]
}
