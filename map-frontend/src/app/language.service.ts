import { Injectable, signal } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private _currentLanguage = signal<string>('pt-BR');

  setLanguage(language: string): void;
  setLanguage(language: LanguageOption): void;
  
  setLanguage(language: string | LanguageOption) {  
    if(typeof language === 'string'){  
      this._currentLanguage.set(language);
    }else{
      this._currentLanguage.set(language.code);
    }
  }
  
  get language() {
    return this._currentLanguage();
  }
}