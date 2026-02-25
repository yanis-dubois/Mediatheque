import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { CollectionsComponent } from '@components/collections/collections.component';

@Component({
  selector: 'app-collections-page',
  standalone: true,
  imports: [CommonModule, RouterModule, CollectionsComponent],
  templateUrl: './collections-page.component.html',
  styleUrl: './collections-page.component.css'
})
export class CollectionsPageComponent { }
