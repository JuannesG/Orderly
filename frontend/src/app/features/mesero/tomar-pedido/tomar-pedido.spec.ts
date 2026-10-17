import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TomarPedido } from './tomar-pedido';

describe('TomarPedido', () => {
  let component: TomarPedido;
  let fixture: ComponentFixture<TomarPedido>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TomarPedido],
    }).compileComponents();

    fixture = TestBed.createComponent(TomarPedido);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
