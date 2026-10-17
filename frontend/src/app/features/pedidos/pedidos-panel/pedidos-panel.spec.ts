import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PedidosPanel } from './pedidos-panel';

describe('PedidosPanel', () => {
  let component: PedidosPanel;
  let fixture: ComponentFixture<PedidosPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PedidosPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(PedidosPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
