import { Component, input } from '@angular/core';

@Component({
  selector: 'app-favorite-action',
  standalone: true,
  imports: [],
  templateUrl: './favorite-action.component.html',
  styleUrl: './favorite-action.component.scss'
})
export class FavoriteActionComponent {
  isFavorite = input.required<boolean>();
}
