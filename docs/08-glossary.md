# 8. Glossary

| Term | Plain meaning |
|---|---|
| **Asset** | A non-code file (image, font, PDF) |
| **Bundle** | All your code squashed into a few small files by Vite for the real website |
| **Clip-path** | CSS that hides part of an element by cutting it to a shape; used for the "wipe" reveals |
| **Component** | A reusable piece of page, written as a function that returns JSX (`Hero`, `Nav`) |
| **Composite** | The final drawing step, where the graphics card stacks layers. Cheap for `transform`/`opacity` |
| **CSS** | The language for how things look |
| **CSS variable** | A named value in CSS, like `--color-accent`, reused everywhere |
| **Default export** | A file's one main export; imported without braces: `import Hero from './Hero'` |
| **Dev server** | The local website Vite runs at `localhost:8443` while you work |
| **`dist/`** | The finished website folder created by `pnpm build`; this is what you upload |
| **Easing** | The speed curve of an animation (fast-then-slow and so on). Ours: `power4.out` / `cubic-bezier(.16,1,.3,1)` |
| **GSAP** | The JavaScript animation library behind the intro, reveals, carousels and parallax |
| **Hook** | A React function starting with `use…` that gives a component memory or side effects |
| **Hot reload** | The browser updating instantly when you save a file |
| **HTML** | The language for what's on the page |
| **Import / export** | How one file shares code with another (see chapter 1) |
| **IntersectionObserver** | A browser feature that says "this element just came on screen" |
| **JSX** | HTML-like tags written inside JavaScript (`<h1>{name}</h1>`) |
| **Lazy loading** | Downloading some code later, only when needed (the 3D scene) |
| **Lenis** | The smooth-scrolling library |
| **Lerp** | "Linear interpolation": moving a fraction of the way to a target each frame, which gives the smooth glide |
| **Media query** | CSS that only applies at certain screen sizes: `@media (max-width: 1023px)` |
| **`node_modules/`** | The downloaded packages. Generated, huge, never edited or uploaded |
| **Package** | Someone else's code you install (React, GSAP, three.js) |
| **Parallax** | Layers moving at different speeds to suggest depth |
| **pnpm / npm** | Package managers: they download packages and run project commands |
| **Pin** | Holding a section still while the page keeps scrolling (the carousels) |
| **Props** | Inputs passed into a component: `<WhatIDo n="01" />` |
| **React** | The library for building the page out of components |
| **Reduced motion** | An OS setting meaning "I want less animation"; the site respects it |
| **Responsive** | Adapting the layout to phone, tablet and desktop |
| **Scroll-snap** | CSS that makes a scroller stop neatly on each card |
| **ScrollTrigger** | The GSAP plugin that starts or scrubs animations based on scroll position |
| **Scrub** | Tying an animation's progress directly to the scrollbar |
| **SplitText** | The GSAP plugin that cuts text into lines/words so each can animate |
| **State** | A component's memory; changing it redraws the component |
| **Sticky** | `position: sticky`: an element that sticks at a set distance from the top while you scroll past |
| **Tailwind** | A library of tiny CSS classes used directly in `className` |
| **three.js / React Three Fiber** | The 3D engine, and the way to write 3D scenes as React components |
| **Token** | A named design value (colour, font) defined once and reused |
| **Transform** | Moving, rotating or scaling an element without affecting layout. Cheap to animate |
| **TypeScript** | JavaScript plus types, which catch mistakes before running |
| **View Transitions API** | A browser feature for animating between two states of a page (the About pager) |
| **Vite** | The tool that translates the code, runs the dev server and builds `dist/` |
| **WebGL** | The browser's 3D graphics system, which three.js uses |
