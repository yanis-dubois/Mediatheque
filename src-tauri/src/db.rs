use rusqlite::{params, Connection, Result};
use std::sync::Mutex;
use strum::IntoEnumIterator;
use tauri::AppHandle;
use tauri::Manager;

use crate::models::enums::match_collection_media_type;
use crate::models::enums::CollectionLayout;
use crate::models::enums::CollectionMediaType;
use crate::models::enums::CollectionType;
use crate::models::enums::MediaOrderDirection;
use crate::models::enums::MediaOrderField;
use crate::models::enums::TagType;
use crate::models::enums::{MediaStatus, MediaType};
use crate::models::query::MediaFilter;
use crate::models::query::MediaOrder;

pub struct DbState {
  pub connection: Mutex<Connection>,
}

pub fn reset_db(app: &AppHandle) -> Result<()> {
  let app_dir = app
    .path()
    .app_data_dir()
    .expect("failed to get app data dir");
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
    -- Settings

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    -- Default Settings

    INSERT OR IGNORE INTO settings (key, value) VALUES ('SCORE_DISPLAY_MODE', 'STARS');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('LANGUAGE', 'EN');



    -- Pin

    CREATE TABLE IF NOT EXISTS pinned_collection (
      context TEXT NOT NULL CHECK(
        context IN ('ALL', 'BOOK', 'MOVIE', 'SERIES', 'VIDEO_GAME', 'TABLETOP_GAME')
      ),
      position INTEGER NOT NULL CHECK(position BETWEEN 0 AND 15),
      collection_id TEXT NOT NULL,
      
      PRIMARY KEY (context, position),
      FOREIGN KEY (collection_id) REFERENCES collection(id) ON DELETE CASCADE
    );

    -- Collection

    CREATE TABLE IF NOT EXISTS collection (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,

      type TEXT NOT NULL CHECK(
        type IN ('MANUAL', 'DYNAMIC', 'SYSTEM')
      ),
      media_type TEXT NOT NULL CHECK(
        media_type IN ('ALL', 'BOOK', 'MOVIE', 'SERIES', 'VIDEO_GAME', 'TABLETOP_GAME')
      ),

      added_date TEXT NOT NULL,

      favorite INTEGER NOT NULL DEFAULT 0 CHECK(favorite IN (0, 1)),
      description TEXT NOT NULL DEFAULT '',

      preferred_layout TEXT CHECK(
        preferred_layout IN ('GRID', 'ROW', 'COLUMN', 'LIST')
      ) DEFAULT 'GRID',
      sort_order TEXT, -- in JSON, ex: [{field: 'favorite', direction: 'DESC'}, {field: 'status', direction: 'ASC'}]
      filter TEXT, -- for dynamic colection - in JSON, ex: [{media_type: 'MOVIE'}, {favorite: 'true'}]

      has_image INTEGER NOT NULL DEFAULT 0 CHECK(has_image IN (0, 1)),
      can_be_sorted INTEGER NOT NULL DEFAULT 0 CHECK(can_be_sorted IN (0, 1))
    );

    -- Manual Collection

    CREATE TABLE IF NOT EXISTS collection_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection_id TEXT NOT NULL,
      media_id TEXT NOT NULL,
      position INTEGER NOT NULL, -- allow personnalised order

      FOREIGN KEY (collection_id) REFERENCES collection(id) ON DELETE CASCADE,
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    );



    -- Abstract Media

    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY NOT NULL,
      external_id INTEGER NOT NULL,
      media_type TEXT NOT NULL CHECK(
        media_type IN ('BOOK', 'MOVIE', 'SERIES', 'VIDEO_GAME', 'TABLETOP_GAME')
      ),

      poster_width INTEGER NOT NULL,
      poster_height INTEGER NOT NULL,

      title TEXT NOT NULL,
      description TEXT NOT NULL,

      release_date TEXT NOT NULL,
      added_date TEXT NOT NULL,

      status TEXT NOT NULL CHECK(
        status IN ('FINISHED', 'IN_PROGRESS', 'TO_DISCOVER', 'DROPPED')
      ),
      favorite INTEGER NOT NULL DEFAULT 0 CHECK(favorite IN (0, 1)),
      notes TEXT NOT NULL DEFAULT '',
      score INTEGER CHECK(score BETWEEN 0 AND 100),

      has_poster INTEGER NOT NULL DEFAULT 0 CHECK(has_poster IN (0, 1)),
      has_backdrop INTEGER NOT NULL DEFAULT 0 CHECK(has_backdrop IN (0, 1))
    );

    -- Detailed Media

    CREATE TABLE IF NOT EXISTS movie (
      media_id TEXT PRIMARY KEY,

      duration INTEGER NOT NULL,

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

    CREATE TABLE IF NOT EXISTS tag (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );



    -- Media Relations

    -- Person
    CREATE TABLE IF NOT EXISTS media_person (
      media_id TEXT NOT NULL,
      person_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      PRIMARY KEY (media_id, person_id, role),
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
      FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE
    );

    -- Company
    CREATE TABLE IF NOT EXISTS media_company (
      media_id TEXT NOT NULL,
      company_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      PRIMARY KEY (media_id, company_id, role),
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE
    );

    -- Tag
    CREATE TABLE IF NOT EXISTS media_tag (
      media_id TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(
        type IN ('GENRE', 'SAGA', 'GAME_MECHANIC')
      ),
      PRIMARY KEY (media_id, tag_id, type),
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE
    );



    -- Collection Index

    CREATE INDEX IF NOT EXISTS idx_collection_media_ids ON collection_media(collection_id, media_id);
    CREATE INDEX IF NOT EXISTS idx_collection_media_pos ON collection_media(collection_id, position);

    -- Media Index

    CREATE INDEX IF NOT EXISTS idx_media_type_external_id ON media(media_type, external_id);
    CREATE INDEX IF NOT EXISTS idx_media_external_id ON media(external_id);
    CREATE INDEX IF NOT EXISTS idx_media_id ON media(id);
    CREATE INDEX IF NOT EXISTS idx_media_title ON media(title);
    CREATE INDEX IF NOT EXISTS idx_media_release_date ON media(release_date);
    CREATE INDEX IF NOT EXISTS idx_media_added_date ON media(added_date);
    CREATE INDEX IF NOT EXISTS idx_media_status ON media(status);
    CREATE INDEX IF NOT EXISTS idx_media_favorite ON media(favorite);

    -- Relation Index (for revert search)

    CREATE INDEX IF NOT EXISTS idx_media_person_reverse ON media_person(person_id, role);
    CREATE INDEX IF NOT EXISTS idx_media_company_reverse ON media_company(company_id, role);
    CREATE INDEX idx_media_tag_type ON media_tag(type);
    "
  )?;

  Ok(())
}

//*************************************//
//************// SEEDING //************//
//*************************************//

struct SeedMedia<'a> {
  id: i32,
  external_id: u32,
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
  score: Option<u32>,
  has_poster: i32,
  has_backdrop: i32,

  // details
  movie_details: Option<SeedMovie<'a>>,
  series_details: Option<SeedSeries<'a>>,
  tabletop_game_details: Option<SeedTabletopGame<'a>>,
}

impl<'a> Default for SeedMedia<'a> {
  fn default() -> Self {
    Self {
      id: 0,
      external_id: 0,
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
      has_poster: 1,
      has_backdrop: 0,
      score: None,
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

#[derive(Clone)]
struct SeedCollection<'a> {
  id: i32,
  name: &'a str,
  collection_type: CollectionType,
  media_type: CollectionMediaType,
  can_be_sorted: i32,
  added_date: &'a str,
  favorite: i32,
  description: &'a str,
  sort_order: Vec<MediaOrder>,
  prefered_view: CollectionLayout,
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
      can_be_sorted: 1,
      added_date: "2026-01-01",
      favorite: 0,
      description: "",
      sort_order: vec![],
      prefered_view: CollectionLayout::Grid,
      has_image: 0,
      collection_manual: None,
      collection_dynamic: None,
    }
  }
}

#[derive(Default, Clone)]
struct SeedCollectionManual {
  media_ids: Vec<i32>,
}

#[derive(Default, Clone)]
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

  let media_list = seed_media_data();

  for m in media_list {
    // conversion Enums -> String (format SCREAMING_SNAKE_CASE)
    let media_type_str = m.media_type.to_string();
    let status_str = m.status.to_string();
    let media_id_str = m.id.to_string();

    // insert in parent table Media
    tx.execute(
      "INSERT INTO media (id, external_id, media_type, poster_width, poster_height, title, description, release_date, added_date, status, favorite, notes, score, has_poster, has_backdrop)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
      params![
        media_id_str,
        m.external_id,
        media_type_str,
        m.image_width,
        m.image_height,
        m.title,
        m.description,
        m.release_date,
        m.added_date,
        status_str,
        m.favorite,
        m.notes,
        m.score,
        m.has_poster,
        m.has_backdrop
      ],
    )?;

    // -- add detail informations

    // movies
    if let Some(details) = m.movie_details {
      tx.execute(
        "INSERT INTO movie (media_id, duration) VALUES (?1, ?2)",
        params![media_id_str, details.duration],
      )?;
      seed_persons(&tx, &media_id_str, details.directors, "DIRECTOR")?;
      if let Some(serie) = details.serie {
        seed_saga(&tx, &media_id_str, vec![serie])?;
      }
      seed_genres(&tx, &media_id_str, details.genres)?;
    }
    // series
    else if let Some(details) = m.series_details {
      tx.execute(
        "INSERT INTO series (media_id, seasons, episodes) VALUES (?1, ?2, ?3)",
        params![media_id_str, details.seasons, details.episodes],
      )?;
      seed_persons(&tx, &media_id_str, details.creators, "CREATOR")?;
      seed_genres(&tx, &media_id_str, details.genres)?;
    }
    // tabletop game
    else if let Some(details) = m.tabletop_game_details {
      tx.execute(
        "INSERT INTO tabletop_game (media_id, player_count, playing_time) VALUES (?1, ?2, ?3)",
        params![media_id_str, details.player_count, details.playing_time],
      )?;
      seed_persons(&tx, &media_id_str, details.designers, "DESIGNER")?;
      seed_persons(&tx, &media_id_str, details.artists, "ARTIST")?;
      seed_companies(&tx, &media_id_str, details.publishers, "PUBLISHER")?;
      seed_game_mechanics(&tx, &media_id_str, details.game_mechanics)?;
    }
  }

  /* ****************************** */

  let collection_list = seed_collection_data();

  for mut c in collection_list {
    if c.id == 201 {
      if let Some(manual) = &mut c.collection_manual {
        for _ in 1..10000 {
          manual.media_ids.push(1);
        }
      }
    }

    seed_collection(&tx, c)?;
  }

  // system collection
  let mut pinned_cpt = 0;
  let mut system_collection_id = 0;
  for mut c in seed_system_collection_data() {
    for media_type_str in std::iter::once(CollectionMediaType::All.to_db_string())
      .chain(MediaType::iter().map(|m| m.to_string()))
    {
      let media_type = match_collection_media_type(&media_type_str);
      c.media_type = media_type.clone();

      if let CollectionMediaType::Specific(mt) = media_type {
        let mut current_filter = c
          .collection_dynamic
          .as_ref()
          .and_then(|cd| cd.filter.clone())
          .unwrap_or_else(|| MediaFilter::default());

        current_filter.media_type = Some(mt);

        c.collection_dynamic = Some(SeedCollectionDynamic {
          filter: Some(current_filter),
        });
      }
      c.id = system_collection_id;

      seed_collection(&tx, c.clone())?;

      tx.execute(
        "INSERT INTO pinned_collection (context, position, collection_id)
          VALUES (?1, ?2, ?3)",
        params![media_type_str, pinned_cpt, system_collection_id.to_string()],
      )?;

      system_collection_id += 1;
    }

    pinned_cpt += 1;
  }

  // validate all operations
  tx.commit()?;
  println!("Database initialized with success !");
  Ok(())
}
fn seed_persons(
  tx: &rusqlite::Transaction,
  media_id: &str,
  names: Vec<&str>,
  role: &str,
) -> rusqlite::Result<()> {
  for name in names {
    tx.execute("INSERT OR IGNORE INTO person (name) VALUES (?1)", [name])?;
    tx.execute(
      "INSERT INTO media_person (media_id, person_id, role)
        SELECT ?1, id, ?3 FROM person WHERE name = ?2",
      params![media_id, name, role],
    )?;
  }
  Ok(())
}
fn seed_companies(
  tx: &rusqlite::Transaction,
  media_id: &str,
  names: Vec<&str>,
  role: &str,
) -> rusqlite::Result<()> {
  for name in names {
    tx.execute("INSERT OR IGNORE INTO company (name) VALUES (?1)", [name])?;
    tx.execute(
      "INSERT INTO media_company (media_id, company_id, role)
        SELECT ?1, id, ?3 FROM company WHERE name = ?2",
      params![media_id, name, role],
    )?;
  }
  Ok(())
}
fn seed_genres(
  tx: &rusqlite::Transaction,
  media_id: &str,
  genres: Vec<&str>,
) -> rusqlite::Result<()> {
  for genre in genres {
    tx.execute("INSERT OR IGNORE INTO tag (name) VALUES (?1)", [genre])?;
    tx.execute(
      "INSERT INTO media_tag (media_id, tag_id, type)
        SELECT ?1, id, ?3 FROM tag WHERE name = ?2",
      params![media_id, genre, "GENRE"],
    )?;
  }
  Ok(())
}
fn seed_saga(tx: &rusqlite::Transaction, media_id: &str, sagas: Vec<&str>) -> rusqlite::Result<()> {
  for saga in sagas {
    tx.execute("INSERT OR IGNORE INTO tag (name) VALUES (?1)", [saga])?;
    tx.execute(
      "INSERT INTO media_tag (media_id, tag_id, type)
        SELECT ?1, id, ?3 FROM tag WHERE name = ?2",
      params![media_id, saga, "SAGA"],
    )?;
  }
  Ok(())
}
fn seed_game_mechanics(
  tx: &rusqlite::Transaction,
  media_id: &str,
  game_mechanics: Vec<&str>,
) -> rusqlite::Result<()> {
  for mech in game_mechanics {
    tx.execute("INSERT OR IGNORE INTO tag (name) VALUES (?1)", [mech])?;
    tx.execute(
      "INSERT INTO media_tag (media_id, tag_id, type)
        SELECT ?1, id, ?3 FROM tag WHERE name = ?2",
      params![media_id, mech, "GAME_MECHANIC"],
    )?;
  }
  Ok(())
}
fn seed_collection(tx: &rusqlite::Transaction, c: SeedCollection) -> rusqlite::Result<()> {
  // enum -> string
  let collection_type_str = c.collection_type.to_string();
  let media_type_str = &c.media_type.to_db_string();
  let view_str = c.prefered_view.to_string();

  // Vec<MediaOrder> -> JSON
  let sort_order_json = serde_json::to_string(&c.sort_order)
    .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

  // MediaFilter -> JSON
  let mut filter_json = "".to_string();
  if let Some(dynamic) = c.collection_dynamic {
    if let Some(filter_obj) = dynamic.filter {
      // MediaFilter -> JSON
      filter_json = serde_json::to_string(&filter_obj)
        .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
    }
  }

  // insert in parent table Collection
  tx.execute(
    "INSERT INTO collection (id, name, type, media_type, added_date, favorite, description, preferred_layout, sort_order, filter, has_image, can_be_sorted)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
    params![
      c.id.to_string(),
      c.name,
      collection_type_str,
      media_type_str,
      c.added_date,
      c.favorite,
      c.description,
      view_str,
      sort_order_json,
      filter_json,
      c.has_image,
      c.can_be_sorted
    ],
  )?;

  // insert details

  // manual collection
  if let Some(manual) = c.collection_manual {
    for (pos, m_id) in manual.media_ids.iter().enumerate() {
      tx.execute(
        "INSERT INTO collection_media (collection_id, media_id, position)
         VALUES (?1, ?2, ?3)",
        params![c.id.to_string(), m_id.to_string(), pos as i32],
      )?;
    }
  }

  Ok(())
}

fn seed_media_data() -> Vec<SeedMedia<'static>> {
  vec![
    SeedMedia {
      id: 1,
      external_id: 438631,
      media_type: MediaType::Movie,
      title: "Dune : Première partie",
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
      score: Some(95),
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
      title: "Seti",
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

fn seed_collection_data() -> Vec<SeedCollection<'static>> {
  vec![
    SeedCollection {
      id: 100,
      name: "Movie",
      collection_type: CollectionType::Dynamic,
      media_type: CollectionMediaType::Specific(MediaType::Movie),
      prefered_view: CollectionLayout::Grid,
      collection_dynamic: Some(SeedCollectionDynamic {
        filter: Some(MediaFilter {
          media_type: Some(MediaType::Movie),
          ..Default::default()
        }),
      }),
      ..Default::default()
    },
    SeedCollection {
      id: 101,
      name: "Series",
      collection_type: CollectionType::Dynamic,
      media_type: CollectionMediaType::Specific(MediaType::Series),
      prefered_view: CollectionLayout::Grid,
      collection_dynamic: Some(SeedCollectionDynamic {
        filter: Some(MediaFilter {
          media_type: Some(MediaType::Series),
          ..Default::default()
        }),
      }),
      ..Default::default()
    },
    SeedCollection {
      id: 102,
      name: "Tabletop Game",
      collection_type: CollectionType::Dynamic,
      media_type: CollectionMediaType::Specific(MediaType::TabletopGame),
      prefered_view: CollectionLayout::Grid,
      collection_dynamic: Some(SeedCollectionDynamic {
        filter: Some(MediaFilter {
          media_type: Some(MediaType::TabletopGame),
          ..Default::default()
        }),
      }),
      ..Default::default()
    },
    SeedCollection {
      id: 103,
      name: "Dune",
      collection_type: CollectionType::Dynamic,
      prefered_view: CollectionLayout::Row,
      collection_dynamic: Some(SeedCollectionDynamic {
        filter: Some(MediaFilter {
          title: Some("Dune".to_string()),
          ..Default::default()
        }),
      }),
      ..Default::default()
    },
    SeedCollection {
      id: 104,
      name: "Finished Movie with 'A'",
      collection_type: CollectionType::Dynamic,
      media_type: CollectionMediaType::Specific(MediaType::Movie),
      prefered_view: CollectionLayout::Column,
      collection_dynamic: Some(SeedCollectionDynamic {
        filter: Some(MediaFilter {
          media_type: Some(MediaType::Movie),
          status: Some(MediaStatus::Finished),
          search_query: Some("A".to_string()),
          ..Default::default()
        }),
      }),
      ..Default::default()
    },
    SeedCollection {
      id: 105,
      name: "Movie ordered by Genre",
      collection_type: CollectionType::Dynamic,
      media_type: CollectionMediaType::Specific(MediaType::Movie),
      prefered_view: CollectionLayout::Row,
      sort_order: vec![MediaOrder {
        field: MediaOrderField::Genre,
        direction: MediaOrderDirection::Asc,
      }],
      collection_dynamic: Some(SeedCollectionDynamic {
        filter: Some(MediaFilter {
          media_type: Some(MediaType::Movie),
          ..Default::default()
        }),
      }),
      ..Default::default()
    },
    SeedCollection {
      id: 106,
      name: "Movie ordered by Directors",
      collection_type: CollectionType::Dynamic,
      media_type: CollectionMediaType::Specific(MediaType::Movie),
      prefered_view: CollectionLayout::Row,
      sort_order: vec![MediaOrder {
        field: MediaOrderField::Director,
        direction: MediaOrderDirection::Asc,
      }],
      collection_dynamic: Some(SeedCollectionDynamic {
        filter: Some(MediaFilter {
          media_type: Some(MediaType::Movie),
          ..Default::default()
        }),
      }),
      ..Default::default()
    },
    SeedCollection {
      id: 107,
      name: "Series ordered by Creators",
      collection_type: CollectionType::Dynamic,
      media_type: CollectionMediaType::Specific(MediaType::Series),
      prefered_view: CollectionLayout::Row,
      sort_order: vec![MediaOrder {
        field: MediaOrderField::Creator,
        direction: MediaOrderDirection::Asc,
      }],
      collection_dynamic: Some(SeedCollectionDynamic {
        filter: Some(MediaFilter {
          media_type: Some(MediaType::Series),
          ..Default::default()
        }),
      }),
      ..Default::default()
    },
    SeedCollection {
      id: 108,
      name: "Series ordered by Genre",
      collection_type: CollectionType::Dynamic,
      media_type: CollectionMediaType::Specific(MediaType::Series),
      prefered_view: CollectionLayout::Row,
      sort_order: vec![MediaOrder {
        field: MediaOrderField::Genre,
        direction: MediaOrderDirection::Asc,
      }],
      collection_dynamic: Some(SeedCollectionDynamic {
        filter: Some(MediaFilter {
          media_type: Some(MediaType::Series),
          ..Default::default()
        }),
      }),
      ..Default::default()
    },
    SeedCollection {
      id: 110,
      name: "Sci-Fi",
      collection_type: CollectionType::Dynamic,
      prefered_view: CollectionLayout::Row,
      collection_dynamic: Some(SeedCollectionDynamic {
        filter: Some(MediaFilter {
          tag: Some((TagType::Genre, "Sci-Fi".to_string())),
          ..Default::default()
        }),
      }),
      ..Default::default()
    },
    SeedCollection {
      id: 111,
      name: "Denis Villeneuve",
      collection_type: CollectionType::Dynamic,
      prefered_view: CollectionLayout::Row,
      collection_dynamic: Some(SeedCollectionDynamic {
        filter: Some(MediaFilter {
          person: Some("Denis Villeneuve".to_string()),
          ..Default::default()
        }),
      }),
      ..Default::default()
    },
    SeedCollection {
      id: 112,
      name: "All Media",
      collection_type: CollectionType::Dynamic,
      prefered_view: CollectionLayout::Row,
      collection_dynamic: Some(SeedCollectionDynamic { filter: None }),
      ..Default::default()
    },
    SeedCollection {
      id: 200,
      name: "My Collection",
      collection_type: CollectionType::Manual,
      prefered_view: CollectionLayout::Row,
      collection_manual: Some(SeedCollectionManual {
        media_ids: vec![1, 1, 4, 16, 102, 201],
      }),
      ..Default::default()
    },
    SeedCollection {
      id: 201,
      name: "My Movie Collection",
      collection_type: CollectionType::Manual,
      media_type: CollectionMediaType::Specific(MediaType::Movie),
      prefered_view: CollectionLayout::Row,
      collection_manual: Some(SeedCollectionManual {
        media_ids: vec![7, 5, 6, 15],
      }),
      ..Default::default()
    },
    SeedCollection {
      id: 202,
      name: "My Collection",
      collection_type: CollectionType::Manual,
      prefered_view: CollectionLayout::Row,
      collection_manual: Some(SeedCollectionManual {
        media_ids: vec![1, 4, 16, 102, 201],
      }),
      ..Default::default()
    },
  ]
}

fn seed_system_collection_data() -> Vec<SeedCollection<'static>> {
  vec![
    SeedCollection {
      id: 0,
      name: "Favorites",
      collection_type: CollectionType::System,
      prefered_view: CollectionLayout::Row,
      collection_dynamic: Some(SeedCollectionDynamic {
        filter: Some(MediaFilter {
          favorite_only: Some(true),
          ..Default::default()
        }),
      }),
      ..Default::default()
    },
    SeedCollection {
      id: 1,
      name: "Finished",
      collection_type: CollectionType::System,
      prefered_view: CollectionLayout::Row,
      collection_dynamic: Some(SeedCollectionDynamic {
        filter: Some(MediaFilter {
          status: Some(MediaStatus::Finished),
          ..Default::default()
        }),
      }),
      ..Default::default()
    },
    SeedCollection {
      id: 2,
      name: "In Progress",
      collection_type: CollectionType::System,
      prefered_view: CollectionLayout::Row,
      collection_dynamic: Some(SeedCollectionDynamic {
        filter: Some(MediaFilter {
          status: Some(MediaStatus::InProgress),
          ..Default::default()
        }),
      }),
      ..Default::default()
    },
    SeedCollection {
      id: 3,
      name: "To Discover",
      collection_type: CollectionType::System,
      prefered_view: CollectionLayout::Row,
      collection_dynamic: Some(SeedCollectionDynamic {
        filter: Some(MediaFilter {
          status: Some(MediaStatus::ToDiscover),
          ..Default::default()
        }),
      }),
      ..Default::default()
    },
    SeedCollection {
      id: 4,
      name: "Recently Added",
      can_be_sorted: 0,
      collection_type: CollectionType::System,
      prefered_view: CollectionLayout::Row,
      sort_order: vec![MediaOrder {
        field: MediaOrderField::AddedDate,
        direction: MediaOrderDirection::Desc,
      }],
      collection_dynamic: Some(SeedCollectionDynamic { filter: None }),
      ..Default::default()
    },
  ]
}
