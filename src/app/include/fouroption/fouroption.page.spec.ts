import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FouroptionPage } from './fouroption.page';

describe('FouroptionPage', () => {
  let component: FouroptionPage;
  let fixture: ComponentFixture<FouroptionPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FouroptionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
