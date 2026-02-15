/**
 * Skill Stacks（ポートフォリオサイトより移植・ダークテーマ用）
 * https://github.com/koala-craft/portfolio-site
 */

import {
  FaAws,
  FaCss3Alt,
  FaDatabase,
  FaDocker,
  FaGitAlt,
  FaGithub,
  FaHtml5,
  FaJava,
  FaJs,
  FaPython,
  FaReact,
  FaRust,
} from 'react-icons/fa'
import { PiFigmaLogoFill } from 'react-icons/pi'
import {
  SiNextdotjs,
  SiPhp,
  SiSpring,
  SiTypescript,
  SiVite,
} from 'react-icons/si'
import { HiOutlineBadgeCheck } from 'react-icons/hi'

const SKILL_SECTIONS = [
  {
    title: 'Languages',
    skills: [
      { name: 'HTML', Icon: FaHtml5, class: 'fill-[#E4522C]' },
      { name: 'CSS', Icon: FaCss3Alt, class: 'fill-[#086fc2]' },
      { name: 'JavaScript', Icon: FaJs, class: 'fill-[#f7e025]' },
      { name: 'TypeScript', Icon: SiTypescript, class: 'fill-[#087ecd]' },
      { name: 'Rust', Icon: FaRust, class: 'fill-[#262626]' },
      { name: 'Python', Icon: FaPython, class: 'fill-[#ffd107]' },
      { name: 'PHP', Icon: SiPhp, class: 'fill-[#8c96c0]' },
      { name: 'SQL', Icon: FaDatabase, class: 'fill-zinc-400' },
      { name: 'JAVA', Icon: FaJava, class: 'fill-[#e73131]' },
    ],
  },
  {
    title: 'Frameworks & Libraries',
    skills: [
      { name: 'React', Icon: FaReact, class: 'fill-[#30C7EC]' },
      { name: 'Next.js', Icon: SiNextdotjs, class: 'fill-zinc-100' },
      { name: 'SpringBoot', Icon: SiSpring, class: 'fill-[#88db53]' },
    ],
  },
  {
    title: 'Tools & Technologies',
    skills: [
      { name: 'Docker', Icon: FaDocker, class: 'fill-[#2a9aed]' },
      { name: 'Git', Icon: FaGitAlt, class: 'fill-[#f04234]' },
      { name: 'Github', Icon: FaGithub, class: 'fill-zinc-100' },
      { name: 'Figma', Icon: PiFigmaLogoFill, class: 'fill-zinc-100' },
      { name: 'Vite', Icon: SiVite, class: 'fill-[#ffcc2a]' },
      { name: 'AWS', Icon: FaAws, class: 'fill-[#ed8e08]' },
    ],
  },
  {
    title: 'Certifications',
    skills: [
      { name: '基本情報技術者', Icon: HiOutlineBadgeCheck, class: 'text-cyan-400' },
      { name: '応用情報技術者', Icon: HiOutlineBadgeCheck, class: 'text-cyan-400' },
      { name: 'python3 エンジニア認定データ分析実践試験', Icon: HiOutlineBadgeCheck, class: 'text-cyan-400' },
      { name: 'AWS SAA', Icon: HiOutlineBadgeCheck, class: 'text-cyan-400' },
    ],
  },
] as const

export function SkillStacks() {
  return (
    <section className="pt-8 mt-8 border-t border-zinc-800">
      <h2 className="text-xl font-semibold text-zinc-200 mb-1">Skill Stacks</h2>
      <div className="space-y-6">
        {SKILL_SECTIONS.map((section) => (
          <div key={section.title}>
            <h3 className="text-sm font-medium text-zinc-400 mb-3">{section.title}</h3>
            <div className="flex flex-wrap gap-3">
              {section.skills.map(({ name, Icon, class: iconClass }) => (
                <div
                  key={name}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-300"
                >
                  <Icon className={`w-5 h-5 shrink-0 ${iconClass}`} />
                  <span className="text-sm">{name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
