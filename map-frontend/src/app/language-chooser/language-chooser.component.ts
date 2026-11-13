import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { countries } from 'country-flag-icons'
import { LanguageService } from '../language.service';

@Component({
  selector: 'app-language-chooser',
  templateUrl: './language-chooser.component.html',
  styleUrls: ['./language-chooser.component.css']
})

export class LanguageChooserComponent {
  protected languageList: LanguageOption[] = [
    {code:"pt", flag:"🇧🇷", name:"Português"},
    {code:"en", flag:"🇺🇸", name:"English"},
    {code:"es", flag:"🇪🇦", name:"Español"},
    {code:"de", flag:"🇩🇪", name:"Deutsch"},
    {code:"ko", flag:"🇰🇷", name:"한국어"}
  ];
  
  protected isHovering = false;

  @Input() languageOptionsList: Array<string>

  constructor(private languageService: LanguageService){}

  /**
   * The language chooser only makes sense when the map offers more than one
   * language. The backend always includes the default language in the list, so
   * a length of one (or less) means there is nothing to switch to.
   */
  get hasMultipleLanguages(): boolean {
    return (this.languageOptionsList?.length ?? 0) > 1;
  }

  // Derived from the service so it follows the map's default_content_language
  protected get currentLanguage(): LanguageOption {
    return this.languageList.find(language => language.code === this.languageService.language) ?? this.languageList[0];
  }

  onMouseEntering(){
    this.isHovering = true;
  }
  
  onMouseLeaving(){
    this.isHovering = false;
  }

  getBrowserLanguage(){
  }

  setLanguage(language: LanguageOption){
    this.languageService.setLanguage(language)
  }

  isCurrentLanguage(language:LanguageOption){
    if(language.code == this.currentLanguage.code)
      return true
    else
      return false
  }
}
