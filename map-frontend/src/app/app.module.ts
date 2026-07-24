import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';

import { ApiService } from './api.service';
import { EventEmitterService } from './event-emitter.service';
import { AppComponent } from './app.component';
import { MapComponent } from './map/map.component';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { FilterMenuComponent } from './filter-menu/filter-menu.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { LeafletMarkerClusterModule } from '@asymmetrik/ngx-leaflet-markercluster';
import { CollapserComponent } from './collapser/collapser.component';
import { TagSidebarComponent } from './filter-menu/tag-sidebar/tag-sidebar.component';
import { MatTableModule } from '@angular/material/table';
import { SafeHtmlPipe } from './safe-html.pipe';
import { LinksMenuComponent } from './links-menu/links-menu.component';
import { MenuChooserComponent } from './menu-chooser/menu-chooser.component';
import { HelpButtonComponent } from './help-button/help-button.component';

import { OverlayedPopupComponent } from './overlayed-popup/overlayed-popup.component';
import { AppRoutingModule } from './app-routing.module';
import { LocationDetailComponent } from './location-detail/location-detail.component';
import { TagDetailComponent } from './tag-detail/tag-detail.component';
import { SubMapComponent } from './sub-map/sub-map.component';
import { ATLASComponent } from './atlas/atlas.component';
import { FooterComponent } from './footer/footer.component';
import { TooltipComponent } from './tooltip/tooltip.component';
import { ChameleonButtonComponent } from './chameleon-button/chameleon-button.component';

@NgModule({
  declarations: [
    AppComponent,
    MapComponent,
    FilterMenuComponent,
    CollapserComponent,
    TagSidebarComponent,
    SafeHtmlPipe,
    LinksMenuComponent,
    MenuChooserComponent,
    OverlayedPopupComponent,
    LocationDetailComponent,
    TagDetailComponent,
    HelpButtonComponent,
    SubMapComponent,
    ATLASComponent,
    FooterComponent,
    TooltipComponent,
    ChameleonButtonComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    LeafletModule,
    LeafletMarkerClusterModule,
    FormsModule,
    BrowserAnimationsModule,
    MatExpansionModule,
    MatIconModule,
    ScrollingModule,
    MatTableModule,
    AppRoutingModule
  ],
  providers: [ApiService, EventEmitterService],
  bootstrap: [AppComponent]
})
export class AppModule {}
