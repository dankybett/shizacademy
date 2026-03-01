import React, { useState } from 'react';

export default function ComputerDesktop({
  styles,
  onOpenMyBubble,
  onOpenSettings,
  onOpenOzPedia,
  onOpenMyMusic,
  onOpenCalendar,
  onOpenShop,
  onOpenGli,
  showMyBubbleBadge,
  icons: iconsProp,
}) {
  const [hovered, setHovered] = useState(null);
  const [focused, setFocused] = useState(null);

  const defaultIcons = [
    { key: 'mybubble', label: 'myBubble', title: 'MyBubble', src: '/art/mybubbleicon.png', onClick: onOpenMyBubble, badge: !!showMyBubbleBadge },
    { key: 'settings', label: 'Settings', title: 'Settings', src: '/art/settingicon.png', onClick: onOpenSettings },
    { key: 'ozpedia', label: 'Oz-pedia', title: 'Oz-pedia', src: '/art/wikiicon.png', onClick: onOpenOzPedia },
    { key: 'music', label: 'Shizy-FI', title: 'My Music', src: '/art/shizyfiicon.png', onClick: onOpenMyMusic },
    { key: 'calendar', label: 'Calendar', title: 'Calendar', src: '/art/calendaricon.png', onClick: onOpenCalendar },
    { key: 'shop', label: 'Am-Oz-on', title: 'Shop', src: '/art/shopicon.png', onClick: onOpenShop },
    { key: 'gli', label: 'Gli-millonaire', title: 'Gli-millonaire', src: '/art/quizicon.png', onClick: onOpenGli },
  ];
  const icons = (iconsProp && iconsProp.length) ? iconsProp : defaultIcons;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        style={{
          ...styles.desktopIcons,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 96px)',
          gridAutoRows: 'min-content',
          gap: 10,
          alignContent: 'start',
          justifyContent: 'start',
          padding: 12,
          marginLeft: 0,
          top: 0,
        }}
      >
        {icons.map((icon) => {
          const isHovered = hovered === icon.key;
          const isFocused = focused === icon.key;
          const btnStyle = {
            ...styles.desktopIcon,
            ...(isHovered ? { background: 'rgba(255,255,255,.08)' } : {}),
            ...(isFocused ? { boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.25)' } : {}),
          };
          return (
          <div key={icon.key} style={styles.desktopIconWrap}>
            <button
              style={btnStyle}
              title={icon.title}
              aria-label={icon.title}
              onClick={icon.onClick}
              onMouseEnter={() => setHovered(icon.key)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setFocused(icon.key)}
              onBlur={() => setFocused(null)}
            >
              <div style={{ position: 'relative' }}>
                <img src={icon.src} alt={icon.title} style={styles.desktopIconImg} />
                {icon.badge && (
                  <div
                    style={{
                      position: 'absolute',
                      right: -2,
                      top: -2,
                      width: 14,
                      height: 14,
                      borderRadius: 99,
                      background: '#e65b7a',
                      border: '1px solid rgba(0,0,0,.4)'
                    }}
                  />
                )}
              </div>
            </button>
            <div style={styles.desktopIconLabel}>{icon.label}</div>
          </div>
          );
        })}
        {/* If fewer than 8 icons, grid naturally leaves empty cells for 2x4 layout */}
      </div>
      <div style={styles.desktopScanlinesOverlay} />
    </div>
  );
}
