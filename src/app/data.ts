import { MediaType } from "@models/media.model"
import { ExternalMovie } from "./models/media-details.model"

export const data: ExternalMovie = {
  mediaType: MediaType.MOVIE,
  directors: ["Denis Villeneuve"],
  genre: ["Sci-Fi", "Adventure"],
  duration: 165,
  title: "Dune 2",
  imageUrl: "https://image.tmdb.org/t/p/w1280/dM2eC02Dq3iMtBZZDFtXSLHfFKJ.jpg",
  description: "Le voyage mythique de Paul Atreides qui s'allie à Chani et aux Fremen dans sa quête de vengeance envers les conspirateurs qui ont anéanti sa famille. Devant choisir entre l'amour de sa vie et le destin de l'univers, il fera tout pour éviter un terrible futur que lui seul peut prédire.",
  releaseDate: "28/02/2024",
}
