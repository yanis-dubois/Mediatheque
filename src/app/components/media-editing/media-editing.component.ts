import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { AbstractControl, FormArray, FormControl, FormGroupDirective, NgForm, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { ErrorStateMatcher } from '@angular/material/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { ApiEntityRelation, LibraryMediaToDto, MediaDto, MediaSource, MediaType, sortEntityByOrder, TagType } from '@models/media.model'
import { MediaImageComponent } from "../media-image/media-image.component";
import { ExternalImagePathPipe } from '@app/pipe/external-image.pipe';
import { LocalImagePathPipe } from '@app/pipe/local-image.pipe';
import { ImageSize, ImageType } from '@app/models/image.model';
import { ImageService } from '@app/services/image.service';
import { ScreenService } from '@app/services/screen.service';
import { EntityService } from '@app/services/entity.service';
import { HumanizePipe } from "../../pipe/humanize";

export class CrossFieldErrorMatcher implements ErrorStateMatcher {
  constructor(private errorKey: string) {}

  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isInvalidControl = !!(control && control.invalid);
    const hasParentError = !!(control?.parent?.hasError(this.errorKey));
    return isInvalidControl || hasParentError;
  }
}

@Component({
  selector: 'app-media-editing',
  standalone: true,
  imports: [CommonModule, RouterModule, MediaImageComponent, ReactiveFormsModule, MatFormField, MatLabel, MatInputModule, MatIconModule, MatSelectModule, HumanizePipe],
  providers: [ExternalImagePathPipe, LocalImagePathPipe],
  templateUrl: './media-editing.component.html',
  styleUrl: './media-editing.component.scss'
})
export class MediaEditingComponent {

  mediaId = input.required<string>();
  initialMediaDto = signal<MediaDto | null>(null);
  selectedType = signal<MediaType | null>(null);

  onCancel = output<void>();
  onConfirm = output<MediaDto | null>();

  entityService = inject(EntityService);
  imageService = inject(ImageService);
  externalImagePath = inject(ExternalImagePathPipe);
  localImagePath = inject(LocalImagePathPipe);
  formBuilder = inject(FormBuilder);
  form!: FormGroup;

  protected readonly MediaSource = MediaSource;
  protected readonly MediaType = MediaType;
  protected readonly ImageType = ImageType;
  protected readonly ImageSize = ImageSize;
  protected readonly TagType = TagType;
  mediaTypeValues = Object.values(MediaType);
  sortEntityByOrder = sortEntityByOrder;

  posterUrl = signal<string | null>(null);
  backdropUrl = signal<string | null>(null);

  screenService = inject(ScreenService);
  isMobile = this.screenService.isMobile;

  media = computed(() => {
    return this.entityService.getMedia(this.mediaId());
  });

  async getSource(type: ImageType, size: ImageSize): Promise<string | null> {
    const media = this.media();
    if (!media) return null;
    return await this.localImagePath.transform(media.id, media.mediaType, media.source, type, size);
  }

  playersMatcher = new CrossFieldErrorMatcher('maxPlayers_rangeError');
  playingTimeMatcher = new CrossFieldErrorMatcher('maxPlayingTime_rangeError');
  videoGameMatcher = new CrossFieldErrorMatcher('completePlayingTime_rangeError');
  readonly positiveNum = [Validators.min(0), Validators.pattern(/^\d*$/)];
  readonly limitedText = (max: number) => [Validators.maxLength(max)];

  private rangeValidator(minKey: string, maxKey: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const min = group.get(minKey)?.value;
      const max = group.get(maxKey)?.value;
  
      if (min !== null && max !== null && min !== '' && max !== '' && Number(min) > Number(max)) {
        const errorKey = `${maxKey}_rangeError`;
        return { [errorKey]: true };
      }
      return null;
    };
  }

  private syncRangeFields(group: FormGroup, minKey: string, maxKey: string) {
    const minControl = group.get(minKey);
    const maxControl = group.get(maxKey);
  
    if (minControl && maxControl) {
      // when we change min, we update max to verify the validity
      minControl.valueChanges.subscribe(() => {
        maxControl.updateValueAndValidity({ emitEvent: false });
      });
    }
  }

  async ngOnInit() {
    // load extension data
    await this.entityService.loadMedia(this.mediaId());

    const media = this.media();
    const dto = LibraryMediaToDto(media);

    if (dto) {
      this.initialMediaDto.set(dto);
      this.initForm(dto);

      this.getSource(ImageType.POSTER, ImageSize.ORIGINAL).then(url => this.posterUrl.set(url));
      this.getSource(ImageType.BACKDROP, ImageSize.ORIGINAL).then(url => this.backdropUrl.set(url));
    }
  }

  private initForm(media: MediaDto) {
    this.selectedType.set(media.mediaType);

    this.form = this.formBuilder.group({
      title: [media.title, Validators.required],
      mediaType: [media.mediaType, Validators.required],
      releaseDate: [media.releaseDate],
      description: [media.description, this.limitedText(5000)],

      // specific extensions
      extension: this.initExtensionGroup(media),

      // relations
      persons: this.initRelationArray(media.persons),
      companies: this.initRelationArray(media.companies),
      tags: this.initTagsGroup(media.tags)
    });

    // add cast if needed
    this.updateConditionalRelations(media.mediaType, media);

    // update form depending on mediaType
    this.form.get('mediaType')?.valueChanges.subscribe((newType: MediaType) => {
      this.selectedType.set(newType);
      this.updateExtensionGroup(newType);
      this.updateConditionalRelations(newType);
    });
  }

  private initExtensionGroup(media: MediaDto): FormGroup {
    const type = media.mediaType;
    const group = this.formBuilder.group({});

    const val = (key: string) => (media as any)[key] ?? null;

    switch (type) {
      case MediaType.BOOK:
        group.addControl('pages', this.formBuilder.control(val('pages'), this.positiveNum));
        break;

      case MediaType.MOVIE:
        group.addControl('duration', this.formBuilder.control(val('duration'), this.positiveNum));
        break;

      case MediaType.SERIES:
        group.addControl('seasons', this.formBuilder.control(val('seasons'), this.positiveNum));
        group.addControl('episodes', this.formBuilder.control(val('episodes'), this.positiveNum));
        break;

      case MediaType.TABLETOP_GAME:
        group.addControl('minPlayers', this.formBuilder.control(val('minPlayers'), this.positiveNum));
        group.addControl('maxPlayers', this.formBuilder.control(val('maxPlayers'), this.positiveNum));
        group.addControl('minPlayingTime', this.formBuilder.control(val('minPlayingTime'), this.positiveNum));
        group.addControl('maxPlayingTime', this.formBuilder.control(val('maxPlayingTime'), this.positiveNum));

        group.addValidators([
          this.rangeValidator('minPlayers', 'maxPlayers'),
          this.rangeValidator('minPlayingTime', 'maxPlayingTime')
        ]);
        this.syncRangeFields(group, 'minPlayers', 'maxPlayers');
        this.syncRangeFields(group, 'minPlayingTime', 'maxPlayingTime');
        break;

      case MediaType.VIDEO_GAME:
        group.addControl('synopsis', this.formBuilder.control(val('synopsis'), this.limitedText(5000)));
        group.addControl('normalPlayingTime', this.formBuilder.control(val('normalPlayingTime'), this.positiveNum));
        group.addControl('completePlayingTime', this.formBuilder.control(val('completePlayingTime'), this.positiveNum));

        group.addValidators(this.rangeValidator('normalPlayingTime', 'completePlayingTime'));
        this.syncRangeFields(group, 'normalPlayingTime', 'completePlayingTime');
        break;
    }

    return group;
  }

  private updateExtensionGroup(type: MediaType) {
    const currentMedia = this.media();
    const currentMediaDto = LibraryMediaToDto(currentMedia);
    if (!currentMediaDto) return;

    const tempMedia = { 
      ...currentMediaDto, 
      mediaType: type,
    } as MediaDto;

    const newExtensionGroup = this.initExtensionGroup(tempMedia);

    this.form.setControl('extension', newExtensionGroup);
    this.form.updateValueAndValidity({ emitEvent: true });

    this.form.get('extension')?.updateValueAndValidity();
  }

  private initRelationArray(relation: Record<string, ApiEntityRelation>): FormArray {
    const array = this.formBuilder.array<FormGroup>([]);

    Object.entries(relation).forEach(([name, relation]) => {
      array.push(this.createRelationGroup(name, relation));
    });

    return array;
  }

  private createRelationGroup(name: string, relation: ApiEntityRelation): FormGroup {
    return this.formBuilder.group({
      name: [name, Validators.required],
      values: this.formBuilder.array(relation.values.map(role => this.formBuilder.control(role)))
    });
  }

  private updateConditionalRelations(type: MediaType, media?: MediaDto) {
    const needsCast = type === MediaType.MOVIE || type === MediaType.SERIES;
  
    if (needsCast) {
      if (!this.form.contains('cast')) {
        const initialCast = media?.cast || {};
        this.form.addControl('cast', this.initRelationArray(initialCast));
      }
    } else {
      if (this.form.contains('cast')) {
        this.form.removeControl('cast');
      }
    }
  }

  private formatRelationForSave(relationArray: any[]): Record<string, ApiEntityRelation> {
    const formatted: Record<string, ApiEntityRelation> = {};
    if (!relationArray) return formatted;

    relationArray.forEach((item: any) => {
      if (item.name && item.name.trim() !== '') {
        formatted[item.name] = {
          order: 0,
          values: item.values ? item.values.filter((val: string) => val && val.trim() !== '') : []
        };
      }
    });
    return formatted;
  }

  private initTagsGroup(tags: Record<TagType, string[]>): FormGroup {
    const group = this.formBuilder.group({});

    Object.values(TagType).forEach(type => {
      const existingTags = tags[type] || [];
      group.addControl(type, this.formBuilder.array(
        existingTags.map(tag => this.formBuilder.control(tag))
      ));
    });

    return group;
  }

  onConfirmClick() {
    const initialDto = this.initialMediaDto();
    if (this.form.invalid || !initialDto) return;

    const { persons, cast, companies, tags, extension, ...baseFields } = this.form.getRawValue();

    const formattedTags: any = {};
    Object.keys(tags).forEach(key => {
      const list = tags[key] as string[];
      const filtered = list.filter(t => t && t.trim() !== '');
      if (filtered.length > 0) {
        formattedTags[key] = filtered;
      }
    });

    const finalDto: MediaDto = {
      ...initialDto,
      ...baseFields,
      ...extension,
      persons: this.formatRelationForSave(persons),
      companies: this.formatRelationForSave(companies),
      tags: formattedTags,
    };
    if (cast !== undefined) {
      finalDto.cast = this.formatRelationForSave(cast);
    }

    this.onConfirm.emit(finalDto);
  }

  // relations helper
  relationFormArray(relation: string) {
    return this.form.get(relation) as FormArray;
  }
  addRelation(relation: string) {
    this.relationFormArray(relation).push(this.createRelationGroup('', { values: [], order: 0 }));
  }
  removeRelation(relation: string, relationIndex: number) {
    this.relationFormArray(relation).removeAt(relationIndex);
  }
  getValuesArray(relation: string, relationIndex: number): FormArray {
    return this.relationFormArray(relation).at(relationIndex).get('values') as FormArray;
  }
  addValue(relation: string, relationIndex: number) {
    this.getValuesArray(relation, relationIndex).push(this.formBuilder.control(''));
  }
  removeValue(relation: string, relationIndex: number, valueIndex: number) {
    this.getValuesArray(relation, relationIndex).removeAt(valueIndex);
  }

  // tags helper
  getTagsArray(type: string): FormArray {
    return this.form.get('tags')?.get(type) as FormArray;
  }
  addTag(type: string) {
    this.getTagsArray(type).push(this.formBuilder.control(''));
  }
  removeTag(type: string, index: number) {
    this.getTagsArray(type).removeAt(index);
  }

}
