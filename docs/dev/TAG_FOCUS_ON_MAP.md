# Foco do Mapa ao Clicar em uma Tag — ChameleonMap Frontend

## Visão Geral

No menu de filtros (`app-filter-menu`), cada tag pode estar relacionada a uma ou mais *locations*. Ao clicar no **nome** de uma tag, o mapa agora se move/dá zoom automaticamente para enquadrar todas as locations relacionadas a ela:

- **1 location**: o mapa centraliza e dá zoom nela (`flyTo`).
- **Várias locations**: o mapa ajusta o zoom/posição para que todas fiquem visíveis ao mesmo tempo (`flyToBounds`).

Antes desta mudança, o nome da tag não tinha interação de clique; agora o clique no nome é usado exclusivamente para focar o mapa. Nenhuma sidebar de detalhes é aberta nesse clique.

---

## Estrutura Envolvida

Framework: **Angular** (sem NgRx/Redux). Comunicação entre `FilterMenuComponent` (filho) e `MapComponent` (pai) via `@Input`/`@Output`, seguindo o mesmo padrão já usado por `tagRemoval`, `tagReactivated`, etc.

```
app-map (MapComponent)
 ├─ owns: this.map (instância L.Map do Leaflet)
 ├─ owns: this.locations (Array<Location>, com latitude/longitude)
 └─ <app-filter-menu> (FilterMenuComponent)
      ├─ [tags]="tags"        (Input, com tag.related_locations: number[])
      ├─ [locations]="locations" (Input)
      └─ (tagFocus)="onTagFocus($event)"  ← novo Output
```

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `map-frontend/src/app/filter-menu/filter-menu.component.html` | `(click)="focusTagOnMap(marker)"` no nome da tag |
| `map-frontend/src/app/filter-menu/filter-menu.component.ts` | novo `@Output() tagFocus` e método `focusTagOnMap(marker)` |
| `map-frontend/src/app/map/map.component.html` | binding `(tagFocus)="onTagFocus($event)"` no `<app-filter-menu>` |
| `map-frontend/src/app/map/map.component.ts` | `onTagFocus`, `focusMapOnLocations`, `getFilterMenuOverlapWidth` |

---

## Como Foi Implementado

### 1. `FilterMenuComponent` resolve as locations da tag

`tag.related_locations` é um array de IDs. Reaproveitamos o helper já existente `getLocationById` para resolver os IDs em objetos `Location`, e emitimos o evento para o componente pai:

```ts
// filter-menu.component.ts
@Output()
tagFocus = new EventEmitter();

focusTagOnMap(marker: MapMarkerType) {
  if (!this.isMarkerTag(marker)) return;
  if (!marker.visibility) return;

  const locations = marker.related_locations
    .map((location_id: number) => this.getLocationById(location_id))
    .filter((location: Location | null): location is Location => location != null);
  this.tagFocus.emit({ locations });
}
```

> **Regra**: se a tag estiver desabilitada (`marker.visibility === false`, ou seja, sem marcadores no mapa), o clique no nome **não** deve focar o mapa — não faria sentido focar locations que não estão sendo exibidas. O template (`filter-menu.component.html`) só liga `(click)="focusTagOnMap(marker)"` na variante *visível* do nome da tag; a variante `tag-name-disabled` não tem esse handler. O guard `if (!marker.visibility) return;` no método é uma segunda camada de proteção, caso o método seja chamado a partir de outro lugar no futuro.

### 2. `MapComponent` move o mapa (Leaflet)

```ts
// map.component.ts
public onTagFocus(event: any) {
  this.focusMapOnLocations(event.locations);
}

private focusMapOnLocations(locations: Array<Location>) {
  if (!locations || locations.length === 0) return;

  const leftPadding = this.getFilterMenuOverlapWidth() + 20;

  if (locations.length === 1) {
    // flyTo não aceita padding, então deslocamos o ponto de destino
    // manualmente em espaço de pixels antes de converter de volta pra lat/lng.
    const zoom = 16;
    const location = locations[0];
    const targetPoint = this.map
      .project([location.latitude, location.longitude], zoom)
      .subtract([leftPadding / 2, 0]);
    const targetCenter = this.map.unproject(targetPoint, zoom);
    this.map.flyTo(targetCenter, zoom);
  } else {
    const bounds = L.latLngBounds(
      locations.map((location): L.LatLngTuple => [location.latitude, location.longitude])
    );
    this.map.flyToBounds(bounds, {
      paddingTopLeft: [leftPadding, 20],
      paddingBottomRight: [20, 20],
      maxZoom: 16
    });
  }
}
```

---

## Problema do Menu Lateral Cobrindo Locations

O painel de filtros (`.scrollbar-box`, dentro de `#app-filter-menu`) fica sobreposto à esquerda do mapa. Sem tratamento, um `fitBounds`/`flyTo` "ingênuo" podia centralizar uma location exatamente atrás do menu, deixando-a invisível.

### Solução: medir a largura real do painel em tempo real

```ts
private getFilterMenuOverlapWidth(): number {
  const filterMenuPanel = document.querySelector('#app-filter-menu .scrollbar-box') as HTMLElement;
  const mapContainer = document.getElementById('map');
  if (!filterMenuPanel || !mapContainer) return 0;

  const overlap = Math.max(0, filterMenuPanel.getBoundingClientRect().right);
  const mapWidth = mapContainer.getBoundingClientRect().width;
  // Em telas estreitas (mobile) o painel pode cobrir quase toda a viewport;
  // nunca reservamos mais que metade do mapa, pra sempre sobrar espaço útil.
  return Math.min(overlap, mapWidth * 0.5);
}
```

Em vez de usar uma largura fixa (312px no desktop, hardcoded em outros pontos do código como `menuCollapse()`), lemos o `getBoundingClientRect()` do painel no momento do clique. Isso cobre automaticamente:

- Painel **expandido** (`left: 15px`) → `right` reflete a borda direita real do menu.
- Painel **colapsado** (`left: -312px`, aplicado via JS em `FilterMenuComponent.menuCollapse()`) → `right` fica ≤ 0, então `overlap` vira `0` (`Math.max(0, ...)`), e nenhum padding extra é aplicado.
- Painel **mobile** (CSS `@media (max-width: 500px)` reduz a largura para 280px) → o valor medido já reflete os 280px, sem precisar de lógica condicional própria.

Esse valor (`leftPadding`) é usado de duas formas:

- **Múltiplas locations**: vira `paddingTopLeft` do `flyToBounds`, empurrando a área de enquadramento para a direita do menu.
- **Uma única location**: como `flyTo` não aceita padding, calculamos manualmente o ponto de destino em pixels (`map.project`), deslocamos pela metade do `leftPadding`, e convertemos de volta pra lat/lng (`map.unproject`) antes de chamar `flyTo`. Isso centraliza o marcador na área *visível* do mapa (a que não está coberta pelo menu), não no centro geométrico do container inteiro.

### Cuidado extra para mobile

Investigação (ver seção abaixo) mostrou que em telas mobile o menu:

- **Não** vira um overlay full-width — continua sendo um painel fixo ancorado à esquerda, só que mais estreito (280px vs 312px no desktop).
- **Não** colapsa automaticamente em telas pequenas — o estado inicial (`isCollapsed = false`) é o mesmo em qualquer viewport; só colapsa se o usuário clicar no botão do `app-collapser`.

Isso significa que em celulares com viewport estreita (~320–375px), o painel expandido (~280–295px de largura) pode cobrir a maior parte da tela, sobrando pouquíssimo espaço de mapa visível. Sem proteção, `getFilterMenuOverlapWidth()` reservaria quase 100% da largura do mapa como padding, o que geraria um enquadramento degenerado (zoom/posição quebrados).

Por isso o `Math.min(overlap, mapWidth * 0.5)` limita o padding reservado a **no máximo metade da largura do mapa**, garantindo que sempre sobra espaço utilizável para o foco funcionar, mesmo no pior caso (tela muito estreita + menu aberto). Nesse cenário extremo o resultado não é um enquadramento perfeito, mas continua funcional — o ideal, do ponto de vista do usuário, é fechar o menu (via `app-collapser`) antes de focar uma tag em telas pequenas.

---

## Limitações Conhecidas / Possíveis Melhorias Futuras

- `getFilterMenuOverlapWidth()` não é recalculado em `resize`/`orientationchange` — só é lido no momento do clique na tag, o que é suficiente pro caso de uso atual (o valor é sempre atual no instante do clique).
- O zoom fixo de `16` para foco em location única e como `maxZoom` do `flyToBounds` é um valor arbitrário; pode ser ajustado caso o produto queira um comportamento diferente por tipo de menu/tag.
- `TagSidebarComponent` existe no código (declarado em `app.module.ts`), mas atualmente não é renderizado em nenhum template — no futuro, se for ligado ao clique da tag, poderia ganhar uma lista de locations clicáveis, cada uma com seu próprio "foco no mapa" individual, reaproveitando `onTagFocus`/`focusMapOnLocations`.
