import About from './components/About'
import AiLab from './components/AiLab'
import Contact from './components/Contact'
import Experience from './components/Experience'
import Hero from './components/Hero'
import Impact from './components/Impact'
import Nav from './components/Nav'
import Recognition from './components/Recognition'
import Teaching from './components/Teaching'
import WhatIDo from './components/WhatIDo'
import { AWARDS, RECOMMENDATIONS } from './data'
import { pad2 } from './components/ui'
import SmoothScroll from './motion/SmoothScroll'

export default function App() {
  // Number the sections in page order, skipping Recognition while it has no content
  let i = 0
  const next = () => pad2(++i)
  const hasRecognition = AWARDS.length > 0 || RECOMMENDATIONS.length > 0

  return (
    <>
      <SmoothScroll />
      <Nav />
      <main>
        <Hero />
        <WhatIDo n={next()} />
        <Impact />
        <Experience n={next()} />
        <AiLab n={next()} />
        <Teaching n={next()} />
        <About n={next()} />
        {hasRecognition && <Recognition n={next()} />}
        <Contact n={next()} />
      </main>
    </>
  )
}
