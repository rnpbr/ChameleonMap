import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';

import { PinnedMenusSidebarComponent } from './pinned-menus-sidebar.component';

describe('PinnedMenusSidebarComponent', () => {
  let component: PinnedMenusSidebarComponent;
  let fixture: ComponentFixture<PinnedMenusSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PinnedMenusSidebarComponent],
      imports: [MatIconModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PinnedMenusSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
