import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopastrologersPage } from './topastrologers.page';

describe('TopastrologersPage', () => {
  let component: TopastrologersPage;
  let fixture: ComponentFixture<TopastrologersPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TopastrologersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
