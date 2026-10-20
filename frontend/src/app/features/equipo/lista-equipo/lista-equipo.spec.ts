import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListaEquipo } from './lista-equipo';

describe('ListaEquipo', () => {
  let component: ListaEquipo;
  let fixture: ComponentFixture<ListaEquipo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaEquipo],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaEquipo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
