import { Media } from './media';
import { movies } from './movie';

export interface Collection {
  id: number;
  name: string;
  mediaList: Media[];
}

export const collections: Collection[] = [
  {
    id: 1,
    name: 'All',
    mediaList: movies
  },
  {
    id: 2,
    name: 'Science Fiction',
    mediaList: movies.filter(movie =>
      movie.genre.includes('Sci-Fi')
    )
  },
  {
    id: 3,
    name: 'Animation',
    mediaList: movies.filter(movie =>
      movie.genre.includes('Animation')
    )
  },
  {
    id: 4,
    name: 'Horror',
    mediaList: movies.filter(movie =>
      movie.genre.includes('Horror')
    )
  }
];
