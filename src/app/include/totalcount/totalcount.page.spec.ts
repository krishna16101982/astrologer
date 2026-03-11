import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TotalcountPage } from './totalcount.page';

describe('TotalcountPage', () => {
  let component: TotalcountPage;
  let fixture: ComponentFixture<TotalcountPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TotalcountPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
