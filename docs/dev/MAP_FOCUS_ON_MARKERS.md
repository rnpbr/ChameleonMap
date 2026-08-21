# Foco do Mapa ao Clicar em um Item do Menu — ChameleonMap Frontend

## Visão Geral

No menu de filtros (`app-filter-menu`), cada item pode ser uma **tag**, um **grupo de links** ou um **KML**. Ao clicar no **nome** do item, o mapa se move/dá zoom automaticamente para enquadrar os elementos relacionados a ele que estão **visíveis no mapa**:

- **Tag**: foca nas *locations* relacionadas que estão no mapa.
- **Grupo de links**: foca nas locations dos *links* do grupo que estão desenhados no mapa.
- **KML**: foca nos limites (*bounds*) da camada KML, se ela estiver carregada no mapa.

O enquadramento segue as mesmas regras já existentes:

- **1 ponto**: o mapa centraliza e dá zoom (`flyTo`).
- **Vários pontos/área**: o mapa ajusta o zoom/posição para enquadrar tudo (`flyToBounds`).

Nenhuma sidebar de detalhes é aberta nesse clique — o clique no nome é usado exclusivamente para focar o mapa.

---

## Estrutura Envolvida

Framework: **Angular** (sem NgRx/Redux). Comunicação entre `FilterMenuComponent` (filho) e `MapComponent` (pai) via `@Input`/`@Output`, seguindo o mesmo padrão já usado por `tagRemoval`, `tagReactivated`, etc.

```
app-map (MapComponent)
 ├─ owns: this.map (instância L.Map do Leaflet)
 ├─ owns: this.locations, this.links, this.kmlLayers
 └─ <app-filter-menu> (FilterMenuComponent)
      ├─ [tags]="tags"          (Input)
      ├─ [linkGroups]="linksGroup" (Input)
      ├─ [kmlShapes]="kmlShapes"   (Input)
      ├─ [locations]="locations"   (Input)
      └─ (markerFocus)="onMarkerFocus($event)"  ← Output
```

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `map-frontend/src/app/filter-menu/filter-menu.component.html` | `(click)="focusMarkerOnMap(marker)"` no nome de qualquer item visível + ícone `layers` para KML |
| `map-frontend/src/app/filter-menu/filter-menu.component.ts` | `@Output() markerFocus`, `focusMarkerOnMap`, `getMarkerIconClass`, `getMarkerDisplayColor` |
| `map-frontend/src/app/map/map.component.html` | binding `(markerFocus)="onMarkerFocus($event)"` no `<app-filter-menu>` |
| `map-frontend/src/app/map/map.component.ts` | `onMarkerFocus`, `resolveTagLocations`, `resolveLinkGroupLocations`, `focusMapOnKml`, `focusMapOnLocations`, `getFilterMenuOverlapWidth` |

---

## Como Foi Implementado

### 1. `FilterMenuComponent` emite o item clicado

O menu não resolve mais as locations (isso agora é responsabilidade do `MapComponent`, que detém todos os dados). O clique apenas emite o item (`Tag | LinksGroup | KmlLayerDto`):

```ts
// filter-menu.component.ts
@Output()
markerFocus = new EventEmitter<MapMarkerType>();

focusMarkerOnMap(marker: MapMarkerType) {
  if (!marker || !marker.visibility) return;
  this.markerFocus.emit(marker);
}
```

No template, o nome de qualquer item visível é um `<button>` clicável; itens com `visibility === false` são renderizados como texto desabilitado (sem handler).

> **Regra de visibilidade**: o clique só foca se o item está com o "olho aberto" (`marker.visibility === true`). Além disso, o `MapComponent` filtra novamente para considerar apenas os elementos **de fato renderizados no mapa** (ver seção 2).

### 2. `MapComponent` resolve e foca por tipo

```ts
// map.component.ts
public onMarkerFocus(marker: MapMarkerType) {
  if (!marker || !marker.visibility) return;
  if (!this.map) return;

  if (this.isTag(marker)) {
    this.focusMapOnLocations(this.resolveTagLocations(marker));
  } else if (this.isLinksGroup(marker)) {
    this.focusMapOnLocations(this.resolveLinkGroupLocations(marker));
  } else if (this.isKml(marker)) {
    this.focusMapOnKml(marker);
  }
}
```

Os type guards diferenciam os três tipos:

```ts
private isTag(marker: MapMarkerType): marker is Tag {
  return 'related_locations' in marker;
}

private isLinksGroup(marker: MapMarkerType): marker is LinksGroup {
  return 'links_color' in marker && !('geojson' in marker);
}

private isKml(marker: MapMarkerType): marker is KmlLayerDto {
  return 'geojson' in marker;
}
```

#### 2.1 Tag → locations visíveis

```ts
private resolveTagLocations(tag: Tag): Array<Location> {
  return tag.related_locations
    .map((locationId: number) => this.getLocationById(locationId))
    .filter((location: Location | null): location is Location =>
      location != null && location.onMap);
}
```

Só entram no enquadramento as locations com `location.onMap === true` (o marcador está de fato no mapa).

#### 2.2 Grupo de links → locations dos links visíveis

```ts
private resolveLinkGroupLocations(linkGroup: LinksGroup): Array<Location> {
  const locationsById = new Map<number, Location>();
  (this._links ?? []).forEach((link: Link) => {
    if (link.links_group !== linkGroup.id) return;
    if (!link.line || !this.map.hasLayer(link.line)) return;

    const location1 = this.getLocationById(link.location_1);
    const location2 = this.getLocationById(link.location_2);
    if (location1) locationsById.set(location1.id, location1);
    if (location2) locationsById.set(location2.id, location2);
  });
  return Array.from(locationsById.values());
}
```

Um link é considerado visível quando sua linha (`link.line`) está adicionada ao mapa (`this.map.hasLayer(link.line)`). As locations dos links visíveis são deduplicadas via `Map` e então enquadradas.

#### 2.3 KML → bounds da camada

```ts
private focusMapOnKml(kml: KmlLayerDto) {
  const layer = this.kmlLayers[kml.id] as L.GeoJSON | undefined;
  if (!layer || !this.map.hasLayer(layer)) return;

  const bounds = layer.getBounds();
  if (!bounds.isValid()) return;

  const leftPadding = this.getFilterMenuOverlapWidth() + 20;
  this.map.flyToBounds(bounds, {
    paddingTopLeft: [leftPadding, 20],
    paddingBottomRight: [20, 20],
    maxZoom: 16
  });
}
```

Só foca se a camada KML estiver no mapa (`this.map.hasLayer(layer)`).

### 3. `MapComponent` move o mapa (Leaflet)

```ts
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

## Ícone do KML no menu

Cada item do menu tem um "ícone" colorido à esquerda do nome, com aparência distinta por tipo:

| Tipo | Classe | Aparência |
|---|---|---|
| Tag | `tag-item-icon` | Pino (gota com círculo branco) |
| Grupo de links | `links-item-icon` | Barrinha horizontal (linha) |
| KML | `kml-layer-icon` | Ícone Material `layers` (camadas), na cor do KML |

A classe é resolvida por `getMarkerIconClass(marker)` e a cor por `getMarkerDisplayColor(marker)` (cinza quando o item está desabilitado/fora do menu selecionado; caso contrário, `marker.currentColor`).

```html
<!-- tag / grupo de links: forma colorida -->
<div id="tag-button" *ngIf="!isMarkerKmlLayerDto(marker)" class="marker-item-icon"
     [ngClass]="getMarkerIconClass(marker)" (click)="pinClick(marker, $event)"
     [ngStyle]="{'background-color': getMarkerDisplayColor(marker)}">
  <span *ngIf="isMarkerTag(marker);" class="white-circle"></span>
</div>

<!-- KML: ícone Material "layers" -->
<div id="tag-button" *ngIf="isMarkerKmlLayerDto(marker)" class="marker-item-icon" (click)="pinClick(marker, $event)">
  <mat-icon class="kml-layer-icon" [style.color]="getMarkerDisplayColor(marker)">layers</mat-icon>
</div>
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

Por isso o `Math.min(overlap, mapWidth * 0.5)` limita o padding reservado a **no máximo metade da largura do mapa**, garantindo que sempre sobra espaço utilizável para o foco funcionar, mesmo no pior caso (tela muito estreita + menu aberto). Nesse cenário extremo o resultado não é um enquadramento perfeito, mas continua funcional — o ideal, do ponto de vista do usuário, é fechar o menu (via `app-collapser`) antes de focar um item em telas pequenas.

---

## Limitações Conhecidas / Possíveis Melhorias Futuras

- `getFilterMenuOverlapWidth()` não é recalculado em `resize`/`orientationchange` — só é lido no momento do clique, o que é suficiente pro caso de uso atual (o valor é sempre atual no instante do clique).
- O zoom fixo de `16` para foco em location única e como `maxZoom` do `flyToBounds` é um valor arbitrário; pode ser ajustado caso o produto queira um comportamento diferente por tipo de item.
- O foco de um **grupo de links** enquadra as *locations* dos links visíveis (não os bounds das linhas em si). Para links retos entre locations isso é equivalente; para links muito curvos, os bounds reais da linha podem exceder os das locations — nesse caso seria possível usar `link.line.getBounds()`.
- `TagSidebarComponent` existe no código (declarado em `app.module.ts`), mas atualmente não é renderizado em nenhum template — no futuro, se for ligado ao clique do item, poderia ganhar uma lista de elementos clicáveis, cada um com seu próprio "foco no mapa" individual, reaproveitando `onMarkerFocus`.
