import { Pipe, PipeTransform } from "@angular/core";
import { LanguageService } from "./language.service";

@Pipe({ name: 'translateTitle', standalone: true, pure: false })
export class TranslateTitlePipe implements PipeTransform {
  constructor(private langService: LanguageService) {}

  transform(item: { name: string; translations?: { language_code: string; name: string }[] }): string {
    const language = this.langService.language;
    const translation = item.translations?.find(translation => translation.language_code === language);
    
    return translation?.name ?? item.name;
  }
}
