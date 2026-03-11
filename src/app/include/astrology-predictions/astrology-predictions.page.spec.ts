import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AstrologyPredictionsPage } from './astrology-predictions.page';

describe('AstrologyPredictionsPage', () => {
  let component: AstrologyPredictionsPage;
  let fixture: ComponentFixture<AstrologyPredictionsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AstrologyPredictionsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
