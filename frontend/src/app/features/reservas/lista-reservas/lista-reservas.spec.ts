import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListaReservas } from './lista-reservas';

describe('ListaReservas', () => {
  let component: ListaReservas;
  let fixture: ComponentFixture<ListaReservas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaReservas],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaReservas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
