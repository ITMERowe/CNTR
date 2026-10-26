import { h } from 'preact';
import { ICONS, SVG_ATTRS, type IconName } from '../ui/icons';

/** Decorative SVG icon (hidden from screen readers; label the button that contains it). */
export function Icon({ name, class: className }: { name: IconName; class?: string }) {
  return (
    <svg {...SVG_ATTRS} class={className ? `icon ${className}` : 'icon'}>
      {ICONS[name].map(([tag, attrs], index) => h(tag, { ...attrs, key: index }))}
    </svg>
  );
}
