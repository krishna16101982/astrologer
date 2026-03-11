import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomesliderPage } from './homeslider.page';

describe('HomesliderPage', () => {
  let component: HomesliderPage;
  let fixture: ComponentFixture<HomesliderPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HomesliderPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
