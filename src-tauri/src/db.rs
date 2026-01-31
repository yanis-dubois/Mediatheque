use rusqlite::{Connection, Result};
use tauri::AppHandle;
use tauri::Manager;

pub fn get_connection(app: &AppHandle) -> Result<Connection> {
  let app_dir = app
    .path()
    .app_data_dir()
    .expect("failed to get app data dir");

  std::fs::create_dir_all(&app_dir).ok();

  let db_path = app_dir.join("mediatheque.db");
  Connection::open(db_path)
}

pub fn init_db(app: &AppHandle) -> Result<()> {
  let connection = get_connection(app)?;

  connection.execute_batch(
    "
    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tag (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS media_tag (
      media_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (media_id, tag_id),
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE
    );
    "
  )?;

  seed_media(&connection)?;

  Ok(())
}



//*************************************//
//************// SEEDING //************//
//*************************************//



struct SeedMedia<'a> {
  id: i32,
  name: &'a str,
  description: &'a str,
  image_url: &'a str,
  tags: Vec<&'a str>,
}

fn seed_media(conn: &Connection) -> Result<()> {
  let count: i64 = conn.query_row(
    "SELECT COUNT(*) FROM media",
    [],
    |row| row.get(0),
  )?;

  if count > 0 {
    return Ok(());
  }

  let media_list = seed_data();

  for media in media_list {
    conn.execute(
    "INSERT INTO media (id, name, description, image_url)
      VALUES (?1, ?2, ?3, ?4)",
      (
        media.id,
        media.name,
        media.description,
        media.image_url,
      ),
    )?;

    for tag in media.tags {
      conn.execute(
        "INSERT OR IGNORE INTO tag (name) VALUES (?1)",
        [tag],
      )?;

      conn.execute(
        "
        INSERT INTO media_tag (media_id, tag_id)
        SELECT ?1, id FROM tag WHERE name = ?2
        ",
        (media.id, tag),
      )?;
    }
  }

  Ok(())
}

fn seed_data() -> Vec<SeedMedia<'static>> {
  vec![
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
  ]
}
