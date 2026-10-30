import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { LanguageService } from '../language.service';
import { 
  countries as flags,
  hasFlag
} from 'country-flag-icons';

@Component({
  selector: 'app-language-chooser',
  templateUrl: './language-chooser.component.html',
  styleUrls: ['./language-chooser.component.css']
})

export class LanguageChooserComponent {
  protected languageList: LanguageOption[] = [
    {code:"pt", name:"Português"},
    {code:"en", name:"English"},
    {code:"es", name:"Español"},
    {code:"de", name:"Deutsch"},
    {code:"ko", name:"한국어"}
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
    if(language.code == this.currentLanguage.code){
      return true
    }else{
      return false
    }
  }

  getFlag(language: LanguageOption){
    if(language.code == 'pt'){
      return this.getFlagUrl('br')
    }else if(language.code == 'ko'){
      return this.getFlagUrl('kr')
    }else if(language.code == 'en'){
      return this.getFlagUrl('us')
    }else{
      return this.getFlagUrl(language.code)
    }
  }
  private getFlagUrl(languageCode: string){
    return `https://hatscripts.github.io/circle-flags/flags/${languageCode}.svg`
  }
}
