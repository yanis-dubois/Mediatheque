import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { ActionBarComponent } from "@app/components/action-bar/action-bar.component";
import { SearchListComponent } from "@app/components/search-list/search-list.component";
import { EntityType, MetadataType } from '@app/models/entity.model';
import { debounceTime, Subject } from 'rxjs';
import { MetadataService } from '@app/services/metadata.service';
import { HumanizePipe } from "../../pipe/humanize";
import { NavService } from '@app/services/nav.service';

@Component({
  selector: 'app-metadata-list-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ActionBarComponent, SearchListComponent, HumanizePipe],
  templateUrl: './metadata-list-page.component.html'
})
export class MetadataListPageComponent { 

  private route = inject(ActivatedRoute);
  layoutData = signal<[string, EntityType][]>([]);
  type = signal<MetadataType>(MetadataType.PERSON);
  searchQuery = signal<string>('');
  private refreshLayout$ = new Subject<void>();
  context = this.navService.context;

  constructor(
    private metadataService: MetadataService,
    private navService: NavService
  ) {
    this.refreshLayout$.pipe(
      debounceTime(50)
    ).subscribe(() => {
      this.loadLayoutData();
    });

    effect(() => {
      this.searchQuery();
      this.context();
      this.refreshLayout$.next();
    });
  }

  async ngOnInit() {
    const typeParam = this.route.snapshot.paramMap.get('type') as MetadataType;

    if (typeParam) {
      this.type.set(typeParam);
      this.loadLayoutData();
    }
  }

  async loadLayoutData() {
    this.layoutData.set(
      await this.metadataService.getMetadataLayout(this.type(), this.searchQuery(), this.context())
    );
  }

}
