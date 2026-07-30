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
  
  protected readonly defaultLanguage: LanguageOption = this.languageList[0];
  protected currentLanguage: LanguageOption;
  protected isHovering = false;

  @Input() languageOptionsList: Array<string>

  constructor(private languageService: LanguageService){}

  ngOnInit(){
    this.currentLanguage = this.defaultLanguage
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
    this.currentLanguage = language
    this.languageService.setLanguage(language)
  }

  isCurrentLanguage(language:LanguageOption){
    if(language.code == this.currentLanguage.code)
      return true
    else
      return false
  }
}