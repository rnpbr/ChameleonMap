import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { MenuChooserComponent } from './menu-chooser.component';

describe('MenuChooserComponent', () => {
  let component: MenuChooserComponent;
  let fixture: ComponentFixture<MenuChooserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MenuChooserComponent],
      imports: [MatExpansionModule, MatIconModule, NoopAnimationsModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MenuChooserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
