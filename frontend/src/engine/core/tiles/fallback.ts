import type { VisibleCell } from './selection';
export function parentCell(cell: VisibleCell): VisibleCell|null {
 return cell.order>0?{order:cell.order-1,npix:Math.floor(cell.npix/4),distance:cell.distance}:null;
}
