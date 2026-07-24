import { 
  Component, 
  OnInit, 
  ViewChild,
  ElementRef, 
  HostListener,
  Input,
} from '@angular/core';
import * as L from 'leaflet';
import { LeafletMouseEvent } from 'leaflet';
import { ATLASComponent } from '../atlas/atlas.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
// import { ScrollBar } from 'leaflet-scroll-bar';

@Component({
  selector: 'app-sub-map',
  templateUrl: './sub-map.component.html',
  styleUrls: ['./sub-map.component.css']
})
export class SubMapComponent implements OnInit {
  @ViewChild(ATLASComponent) ATLAS: ATLASComponent;
  @ViewChild('sub_map') popup_content: ElementRef;
  @ViewChild('phantom_popup_content') phantom_popup_content_html: ElementRef;
  
  public subMap: L.Map;
  private subMapId: string;

  public popupContentBody: SafeHtml = ""
  
  public defaultSubMapCenterCoordinates: L.LatLng;
  private defaultViewBounds: L.LatLngBounds;
  private contentPixelsSize: any;
  private maxViewBounds: L.LatLngBounds;
  private minZoom: number;
  private maxZoom: number;
  private zoomControlPosition: L.ControlPosition;
  
  private _keeper: Location | Tag;
  private _keeperContent: any;
  private _keeperContentContainer: L.Popup;
  private _keeperContentMarker: L.Marker;
  private _keeperContentMarkerPosition: L.LatLng;
  private _keeperContentNorthCenterPoint: L.LatLng;

  // Scroll Bar
  private scrollBar: any;
  private isScrollBarActive: boolean;
  private northBound: number;
  private southBound: number;
  private scrollBarStartCenter: number;
  private scrollBarTranslationIntervalAbsolute: number;
  private scrollBarScreenTranslateInterval: number;
  private scrollHeight: number;

  @Input() locations: any;
  @Input() tags: any;
  @Input() getLocationById: any;
  @Input() getTagById: any;

  constructor(
    private sanitizer: DomSanitizer,
  ) { }

  ngOnInit() {
    // this.initSubMapPropertiesValues();
    // this.initSubMap();
  }

  public restoreDefaultScreenView( map: L.Map = this.subMap , center: any = this.defaultSubMapCenterCoordinates){
    // map.setView(center);
    // map.setZoom(10);
  }

  public set keeper( keeper: Location | Tag){
    this._keeper = keeper;
    // console.log(this._keeper.overlayed_popup_content)
    let keeperHtml = `<div style=''>${this._keeper.overlayed_popup_content}</div>`;
    this.popupContentBody = this.sanitizer.bypassSecurityTrustHtml(keeperHtml);
  
  }


  public setContentDirectly(content: string){
    let fullHtml = `<div style='width:100%;'>${content}</div>`;
    this.popupContentBody = this.sanitizer.bypassSecurityTrustHtml(fullHtml);
  }
    
    
  private initSubMapPropertiesValues() {
    this.subMapId = 'sub-map';
    
    /// Map View
    //  Default View Bounds      
    // this.defaultSubMapCenterCoordinates = new L.LatLng(-14.2350, -51.9253); // Brazil Center
    // this.defaultSubMapCenterCoordinates = new L.LatLng(0, 0);
    
    // this.defaultViewBounds = new L.LatLngBounds(
    //   this.getRealCoord([-10, -10]),
    //   this.getRealCoord([10, 10])
    //   );
      
    //   //  Max View Bounds
    //   this.maxViewBounds = this.defaultViewBounds;
      
    //   //  Zoom Limits       
    //   this.minZoom = 10;
    //   this.maxZoom = 20;
    //   this.zoomControlPosition = 'bottomright';
      
  }
      
  private initSubMap() {
    // Create Sub Map
    this.subMap = L.map(this.subMapId );

    // this.subMap.on('moveend', () => {
    //   if(this.isScrollBarActive)
    //     this.adjustScrollBarPosition();
    // })
    
    // this.subMap.on('mousemove', function(e: L.LeafletMouseEvent) {
    //   var mousePosition = e.latlng;
    //   console.log(mousePosition.lat + ', ' + mousePosition.lng);
    // });

    /// Setting Sub Map 
     // Values Defined in setSubMapPropertiesValues() 
    // this.subMap.fitBounds(this.defaultViewBounds);
    // this.restoreDefaultScreenView();
    // this.subMap.setMaxBounds(this.maxViewBounds);
    // this.subMap.setMaxZoom(this.maxZoom);
    // this.subMap.zoomControl.setPosition( this.zoomControlPosition);
    
    // Others
    // this.subMap.zoomControl.remove();
    // this.subMap.scrollWheelZoom.disable();
    // this.subMap.doubleClickZoom.disable();
    // this.subMap.dragging.disable();
    
    // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    //   attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    // }).addTo(this.subMap);

    // let rct = new L.Rectangle(
    //   this.subMap.getBounds()
    // ).addTo(this.subMap);    
    
    // let rct = new L.Rectangle( new L.LatLngBounds(
    //   [
    //     [-10,-10],
    //     [10, 10]
    //   ]  
    // ),{color: 'red'}).addTo(this.subMap).bringToFront();
    
    // var marker1: any = L.marker([5, 5], {
    //   draggable: false
    // }).addTo(this.subMap);
    
    // var markerIcon = L.icon({
    //   iconUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcThtS4QUEGZg9cg2HyA1drt-zr-m38bHB0PixDX3uRn&s',
    //   iconSize: [100, 40],
    //   iconAnchor: [12, 41],
    //   popupAnchor: [1, -34]
    // });
    
    
    // var marker2: any = L.marker([1, 7], {
    //   draggable: true,
    //   icon: markerIcon
    // }).addTo(this.subMap);
    

    
    // this.subMapContentMarker.setIcon(L.divIcon({
    //   html: '<div><span>My HTML Icon</span></div>',
    //   iconSize: [38, 95],
    //   iconAnchor: [22, 94],
    //   popupAnchor: [-3, -76]
    // }));


    // this.subMapContentMarker.setIcon(null)
    // this.subMapContentMarker.setIcon( 
    //   L.divIcon(
    //     {
    //       html: '<div>HTML AQUI</div>',
    //       iconSize: [25, 41],
    //       iconAnchor: [12, 41],
    //       popupAnchor: [1, -34]
    //     }
    //   )
    // );

    // marker2.bindPopup("An excellent car!").openPopup();
    
    // var myIcon = L.divIcon({
    //   html: this.refactorToHTMLsupport(this._currentPopupOwner.overlayed_popup_content),
    // });
  
    // var marker = L.marker([3, 3], {
    //     icon: myIcon
    // }).addTo(this.subMap);
  }

  private getRealCoord(relativeCoord: L.LatLng | number[]): L.LatLng{
    if(relativeCoord instanceof L.LatLng)  
      return L.latLng(relativeCoord.lat + this.defaultSubMapCenterCoordinates.lat, relativeCoord.lng + this.defaultSubMapCenterCoordinates.lng );
    else
      return L.latLng(relativeCoord[0] + this.defaultSubMapCenterCoordinates.lat, relativeCoord[1] + this.defaultSubMapCenterCoordinates.lng );
  }

  // Change problematics quotes and signal characters for popup HTML insertion
  public getRefactoredHTML(HTMLstring: string) {
    HTMLstring = HTMLstring.toString();
    HTMLstring = HTMLstring.replace(/\"/g, '&quot');
    HTMLstring = HTMLstring.replace(/&quot/g, '&quot ');
    HTMLstring = HTMLstring.replace(/\n|\r/g, '');

    return HTMLstring;
  }

  private getMapScalePixelsToCoord(): L.Point{
    const map_coordinates_width: number = this.subMap.getBounds().getEast() - this.subMap.getBounds().getWest();
    const map_coordinates_height: number = this.subMap.getBounds().getNorth() - this.subMap.getBounds().getSouth();
    const map_pixels_width: number = this.subMap.getSize().x;
    const map_pixels_height: number = this.subMap.getSize().y;
    
    const mapScale: L.Point = new L.Point(
        map_coordinates_width / map_pixels_width,
        map_coordinates_height / map_pixels_height
    );
    
    return mapScale;
  }

  private convertDisplacementPixelsToLatLng( displacement: L.Point ): L.LatLng{
    return new L.LatLng(
      displacement.y * this.getMapScalePixelsToCoord().y, 
      displacement.x * this.getMapScalePixelsToCoord().x 
    );
  }
  
  private convertPixelsHeightToLat( height: number){
    return height * this.getMapScalePixelsToCoord().y;
  }
  
  private convertPixelsWidthToLng( width: number ){
    return width * this.getMapScalePixelsToCoord().x;
  }

  private getMapScaleCoorToPixels(): L.Point{
    return new L.Point( 
      this.getMapScalePixelsToCoord().x ** -1,
      this.getMapScalePixelsToCoord().y ** -1
    );
  }

  private convertLatAmountToPixelsHeight( lat_amount: number){
    return lat_amount * this.getMapScaleCoorToPixels().y;
  }

  private configScrollBarScreenSizeDependentAttributes(){
    this.scrollBarTranslationIntervalAbsolute = this.northBound - this.southBound - this.convertPixelsHeightToLat(this.subMap.getSize().y);
    const heightRatio = this.subMap.getSize().y / this.contentPixelsSize.height;
    this.scrollHeight = this.convertPixelsHeightToLat( heightRatio * this.subMap.getSize().y);
    this.scrollBarScreenTranslateInterval = this.convertPixelsHeightToLat(this.subMap.getSize().y) - this.scrollHeight;
  }

  private configScrollBar(){
    this.northBound = this._keeperContentMarker.getLatLng().lat + this.convertPixelsHeightToLat(this.contentPixelsSize.height/2);
    this.southBound = this._keeperContentMarker.getLatLng().lat - this.convertPixelsHeightToLat(this.contentPixelsSize.height/2);
    this.configScrollBarScreenSizeDependentAttributes();

    if(this.southBound >= this.subMap.getBounds().getSouth()){
      this.isScrollBarActive = false;
    }else{
      this.isScrollBarActive = true;
      const scroll_bar_color = 'gray';
      const windows_SO_scroll_bar_width = 17;
      const scroll_bar_width = this.convertPixelsHeightToLat(windows_SO_scroll_bar_width);

      const scrollBar_rect = L.rectangle(
        [
          [this.subMap.getBounds().getNorth() - this.scrollHeight, this.subMap.getBounds().getEast() - scroll_bar_width],
          [this.subMap.getBounds().getNorth(), this.subMap.getBounds().getEast()]
        ], 
        {
          color: scroll_bar_color, 
          weight: 1,
          fillOpacity: 1
        }
      );
        
      this.scrollBarStartCenter = scrollBar_rect.getBounds().getCenter().lat;
    
      this.scrollBar = L.marker(scrollBar_rect.getBounds().getCenter(),{zIndexOffset:1000}).addTo(this.subMap);
    
      this.scrollBar.setIcon(L.divIcon({
          html: '<div style="background-color: gray; width: 100%; height: 100%;"></div>',
          iconSize: [
            this.convertLatAmountToPixelsHeight(scrollBar_rect.getBounds().getEast() - scrollBar_rect.getBounds().getWest()), 
            this.convertLatAmountToPixelsHeight(scrollBar_rect.getBounds().getNorth() - scrollBar_rect.getBounds().getSouth())
          ]
        }));

      this.scrollBar.on('mousedown', () => {
        // console.log('mousedown')
      });


      // this.scrollBar.bringToFront();
      // this.scrollBar.setZIndexOffset(100);
      // this.scrollBar.dragging.enable({axis:'y'});  
      // this.scrollBar.dragging.limit([[0, 0], [0, 0]]);  
      // this.scrollBar.options.draggable = {
        // };
      // this.scrollBar.dragging.bounds([[0,-1000],[0,1000]]);
        
    }
  }

  @HostListener('mouseup', ['$event'])
  onMouseUp(e:any){
    // console.log('mouseup')
  } 

  @HostListener('release', ['$event'])
  onMouseRelease(e:any){
    // console.log('release')
  } 


  @HostListener('mousewheel', ['$event'])
  onMouseWheel(e: any){
    const default_scroll_amount = 50
    let scroll_amount: number;

    if(this.isScrollBarActive){
      if(e.deltaY > 0 ){
        // down
        if(this.subMap.getBounds().getSouth() > this.southBound){
          scroll_amount = Math.min( 
            default_scroll_amount, 
            this.convertLatAmountToPixelsHeight(this.subMap.getBounds().getSouth() - this.southBound)
          );
          this.subMap.panBy(new L.Point(0, scroll_amount));
        }
      }else{
        // up
        if(this.subMap.getBounds().getNorth() < this.northBound){
          scroll_amount = Math.min( 
            default_scroll_amount, 
            this.convertLatAmountToPixelsHeight(this.northBound - this.subMap.getBounds().getNorth())
          );
          this.subMap.panBy(new L.Point(0, -scroll_amount));
        }
      }
    }
  }

    private adjustScrollBarPosition(){
      const scrollBarCurrentPosition =  this.scrollBar.getLatLng()
      const scrollBarNewPosition = scrollBarCurrentPosition;

      // scrollBarNewPosition.lat = 
        // this.scrollBarStartCenter
        // - this.convertPixelsHeightToLat(this.scrollBarScreenTranslateInterval 
        // * ((this.northBound - this.subMap.getBounds().getNorth()) / this.scrollBarTranslationIntervalAbsolute));
      // this.scrollBar.setLatLng(scrollBarNewPosition)
      const latDesloc = this.northBound - this.subMap.getBounds().getNorth();

      scrollBarNewPosition.lat = 
        this.subMap.getBounds().getNorth()
        - this.scrollHeight / 2
        - this.scrollBarScreenTranslateInterval * (latDesloc / this.scrollBarTranslationIntervalAbsolute);
      
      this.scrollBar.setLatLng(scrollBarNewPosition);
    }

    private wasAlreadyAdded(object: any, map:  L.Map):boolean{
      let wasAlreadyAdded = false;

      map.eachLayer( function(layer) {
        if(layer === object)
          wasAlreadyAdded = true;
      });

      return wasAlreadyAdded;
    }
  }
  