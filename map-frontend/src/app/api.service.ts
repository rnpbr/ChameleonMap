import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class ApiService {
  constructor(private http: HttpClient) {}

  getMenuGroups(): Observable<MenuGroup[]> {
    return this.http.get<MenuGroup[]>('/menugroup/');
  }

  getMenus(): Observable<Menu[]> {
    return this.http.get<Menu[]>('/menu/');
  }

  getTags() {
    return this.http.get<Tag[]>('/tag/');
  }

  getLocations() {
    return this.http.get<Location[]>('/location/');
  }

  getTagRelationships() {
    return this.http.get<TagRelationship[]>('/tagrelationship/');
  }

  getSettings() {
    return this.http.get('/settings/');
  }

  getLinks() {
    return this.http.get<Link[]>('/link/');
  }

  getLinkGroups() {
    return this.http.get<LinksGroup[]>('/linksgroup/');
  }

  getTag(id: number) {
    return this.http.get<Tag>(`/tag/${id}/`);
  }

  getLocation(id: number) {
    return this.http.get<Location>(`/location/${id}/`);
  }

  getKml(url: string) {
    return this.http.get(url, { responseType: 'text' })
  }

  getMapData() {
    return this.http.get<MapDataBundle>('/map-data/');
  }

  getKmlShapes() {
    return this.http.get<KmlShape[]>('/kmlshape/');
  }
}
