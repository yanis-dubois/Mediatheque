import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { invoke } from "@tauri-apps/api/core";

import { CollectionQuery, CollectionQueryType } from '@models/collectionQuery';
import { MediaStatus } from "@models/media";

import { CollectionComponent } from '@components/collection/collection.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, CollectionComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  greetingMessage = "";

  queries: CollectionQuery[] = [
    {type: CollectionQueryType.FAVORITE},
    {type: CollectionQueryType.STATUS, status: MediaStatus.TO_DISCOVER},
    {type: CollectionQueryType.ALL},
  ]

  greet(event: SubmitEvent, name: string): void {
    event.preventDefault();

    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    invoke<string>("greet", { name }).then((text) => {
      this.greetingMessage = text;
    });
  }
}
