import { trigger, transition, style, query, animate, group } from '@angular/animations';

const baseStyle = query(':enter, :leave', [
  style({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    'z-index': 1
  })
], { optional: true });

function isAnimationType(
  value: string, 
  direction: 'forward' | 'backward', 
  orientation: 'left' | 'right'
): boolean {
  console.log('val ', value);
  const parts = value.split(':');
  return parts[1] === direction && parts[2] === orientation;
}

export const slideInAnimation = trigger('routeAnimations', [

  // go forward : new page come from the left
  transition((from, to) => !!(to && isAnimationType(to, 'forward', 'left')), [
    style({ position: 'relative' }),
    baseStyle,
    // page that come : placed on the left
    query(':enter', [
      style({ 'z-index': 10, left: '-100%' })
    ]),
    query(':leave', [
      style({ 'z-index': 1 })
    ]),
    group([
      // page that leave : goes to the right
      query(':leave', [
        animate('200ms ease-out', style({ left: '50%' }))
      ]),
      // page that come : goes to the middle
      query(':enter', [
        animate('200ms ease-out', style({ left: '0%' }))
      ])
    ])
  ]),

  // go backward : last page goes to the left
  transition((from, to) => !!(from && isAnimationType(from, 'forward', 'left')), [
    style({ position: 'relative' }),
    baseStyle,
    // page that come : placed on the right
    query(':enter', [
      style({ 'z-index': 1, left: '50%' })
    ]),
    query(':leave', [
      style({ 'z-index': 10 })
    ]),
    group([
      // page that leave : goes to the left
      query(':leave', [
        animate('200ms ease-in', style({ left: '-100%' }))
      ]),
      // page that come : goes to the middle
      query(':enter', [
        animate('200ms ease-in', style({ left: '0%' }))
      ])
    ])
  ]),

  // go forward : new page come from the right
  transition((from, to) => !!(to && isAnimationType(to, 'forward', 'right')), [
    style({ position: 'relative' }),
    baseStyle,
    // page that come : placed on the left
    query(':enter', [
      style({ 'z-index': 10, left: '100%' })
    ], { optional: true }),
    query(':leave', [
      style({ 'z-index': 1 })
    ], { optional: true }),
    group([
      // page that leave : goes to the right
      query(':leave', [
        animate('200ms ease-out', style({ left: '-50%' }))
      ], { optional: true }),
      // page that come : goes to the middle
      query(':enter', [
        animate('200ms ease-out', style({ left: '0%' }))
      ], { optional: true })
    ])
  ]),

  // go backward : last page goes to the right
  transition((from, to) => !!(to && isAnimationType(to, 'backward', 'right')), [
    style({ position: 'relative' }),
    baseStyle,
    // page that come : placed on the right
    query(':enter', [
      style({ 'z-index': 1, left: '-50%' })
    ], { optional: true }),
    query(':leave', [
      style({ 'z-index': 10 })
    ], { optional: true }),
    group([
      // page that leave : goes to the left
      query(':leave', [
        animate('200ms ease-in', style({ left: '100%' }))
      ], { optional: true }),
      // page that come : goes to the middle
      query(':enter', [
        animate('200ms ease-in', style({ left: '0%' }))
      ], { optional: true })
    ])
  ]),

]);
