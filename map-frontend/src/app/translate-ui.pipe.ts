import { Pipe, PipeTransform } from '@angular/core';
import { LanguageService } from './language.service';

export type TranslationMap = Record<string, string>;

@Pipe({
  name: 'translateUi',
  standalone: true,
  pure: false
})
export class TranslateUiPipe implements PipeTransform {
  private static readonly UI_DICTIONARY: Record<string, TranslationMap> = {
    search_placeholder: {
      pt_br: 'Pesquisar...',
      pt: 'Pesquisar...',
      en: 'Search...',
      es: 'Buscar...'
    },
    search_clear: { pt: 'Limpar busca', en: 'Clear search', es: 'Borrar búsqueda' },
    search_remove: { pt: 'Remover busca', en: 'Remove search', es: 'Quitar búsqueda' },
    search_no_results: { pt: 'Nenhum resultado', en: 'No results', es: 'Sin resultados' },
    search_group_menu: { pt: 'Menus', en: 'Menus', es: 'Menús' },
    search_group_tag: { pt: 'Tags', en: 'Tags', es: 'Tags' },
    search_group_linksGroup: { pt: 'Ligações', en: 'Links', es: 'Enlaces' },
    search_group_kml: { pt: 'KMLs', en: 'KMLs', es: 'KMLs' },
    search_group_location: { pt: 'Locais', en: 'Places', es: 'Lugares' },
    about_this_map: {
      pt_br: 'Sobre este mapa',
      en: 'About This Map',
      es: 'Acerca de este mapa'
    }    
  };

  constructor(private langService: LanguageService) {}

  transform(input: string | TranslationMap, fallbackText = ''): string {
    if (!input) return fallbackText;

    const currentLang = (this.langService.language || 'pt_br').toLowerCase().replace('-', '_');
    const baseLang = currentLang.split('_')[0];

    const translations = typeof input === 'string' 
      ? TranslateUiPipe.UI_DICTIONARY[input] 
      : input;

    if (!translations) {
      return typeof input === 'string' ? input : fallbackText;
    }

    const directMatchKey = Object.keys(translations).find(
      key => key.toLowerCase().replace('-', '_') === currentLang
    );
    if (directMatchKey) return translations[directMatchKey];

    const baseMatchKey = Object.keys(translations).find(
      key => key.toLowerCase().replace('-', '_').split('_')[0] === baseLang
    );
    if (baseMatchKey) return translations[baseMatchKey];

    return translations['en'] || translations['pt_br'] || Object.values(translations)[0] || fallbackText;
  }
}
