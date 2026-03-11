import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AstroprofilePage } from './astroprofile.page';

describe('AstroprofilePage', () => {
  let component: AstroprofilePage;
  let fixture: ComponentFixture<AstroprofilePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AstroprofilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
