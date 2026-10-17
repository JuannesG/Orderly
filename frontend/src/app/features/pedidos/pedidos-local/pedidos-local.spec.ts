import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PedidosLocal } from './pedidos-local';

describe('PedidosLocal', () => {
  let component: PedidosLocal;
  let fixture: ComponentFixture<PedidosLocal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PedidosLocal],
    }).compileComponents();

    fixture = TestBed.createComponent(PedidosLocal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
