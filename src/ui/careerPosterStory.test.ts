import { describe, expect, it } from 'vitest'
import { LEGACY_PRESS_DRINK_EVENT, V3_STORY_EVENTS } from '../data/offPitchStories'
import { V3_STORY_CHAINS, type RepresentativeOffPitchStory } from '../models/offPitchStories'
import { careerPosterMemories, careerPosterStoryLine } from './careerPosterStory'

const base: RepresentativeOffPitchStory = {
  id: 'C03', title: '一位年轻队友把训练笔记递给了你。', windowIndex: 26,
  originalChoiceTitle: '每周留一次简短交流', completed: false,
  summary: '已执行1期、已终止1期；退休，结束执行期比例退款 €20,000。媒体关系+2。',
}

const forbidden = /€|\d|退款|已执行|已终止|结算|后续尚未发生|数值|上次你选择|心理状态|队内关系|媒体关系|实际选择|履历里/

describe('career poster memories', () => {
  it('covers every current choice with specific, recognizable, one-sentence event copy', () => {
    for (const event of V3_STORY_EVENTS) {
      const chain = Object.entries(V3_STORY_CHAINS).find(([, value]) => value.first === event.id || value.followup === event.id)
      for (const choice of event.choices) {
        const isFollowup = chain?.[1].followup === event.id
        const story: RepresentativeOffPitchStory = {
          ...base, id: chain?.[0] ?? `${event.id}:26`, originalChoiceTitle: choice.title,
          completed: true, ...(isFollowup ? { followupChoiceTitle: choice.title, followupWindowIndex: 28 } : {}),
        }
        const line = careerPosterStoryLine(story)
        expect(line, `${event.id}/${choice.id}`).not.toBe('你在球场之外作出了一次属于自己的选择。')
        expect(line).not.toMatch(forbidden)
        expect(line.length).toBeLessThanOrEqual(44)
        expect(line.match(/[。！？]/g)).toHaveLength(1)
      }
    }
  })

  it('identifies the concrete event in all 63 current and legacy choices', () => {
    const subjects: Record<string, RegExp> = {
      V3_E01_PRESS_DRINK: /发布会/,
      V3_E02_AD_TEAMMATE: /队友.*广告/,
      V3_E03_INTERVIEW_CLIP: /采访/,
      V3_E04_FAN_SCHEDULE: /球迷活动/,
      V3_E05_OLD_POST: /旧训练感想/,
      V3_E06_FAMILY_VISIT: /家人来探望/,
      V3_E07_LANGUAGE_MIXUP: /队友.*(邀约|饭局)/,
      V3_E08_NEW_NEIGHBOR: /邻居/,
      V3_E09_LOCAL_RADIO: /本地电台/,
      V3_E10_TEAM_PHOTO: /球队合照/,
      V3_E11_COMMUTE: /训练基地.*站台/,
      V3_E12_FAN_GIFT: /球迷.*小册子/,
      V3_C01A_LOCAL_CAR: /本地代步品牌/,
      V3_C01B_LOCAL_CAR_RETURN: /本地代步品牌.*新邀约/,
      V3_C02A_PUBLIC_RESPONSE: /记者.*训练安排.*分歧/,
      V3_C02B_PUBLIC_RESPONSE_RETURN: /记者回访.*训练分歧/,
      V3_C03A_YOUNG_TEAMMATE: /年轻队友.*训练/,
      V3_C03B_YOUNG_TEAMMATE_RETURN: /年轻队友.*训练笔记/,
      V3_C04A_HOMETOWN_CAMP: /家乡训练营/,
      V3_C04B_HOMETOWN_CAMP_RETURN: /家乡训练营.*信/,
    }
    let count = 0
    for (const event of [...V3_STORY_EVENTS, LEGACY_PRESS_DRINK_EVENT]) {
      for (const choice of event.choices) {
        const line = careerPosterStoryLine({ ...base, id: `${event.id}:26`, originalChoiceTitle: choice.title })
        expect(line, `${event.id}/${choice.id}`).toMatch(subjects[event.id]!)
        expect(line).not.toMatch(/青训中心|兴建|建成|圆梦|夺冠|获得冠军|球星|\d{4}年/)
        expect(line).not.toMatch(forbidden)
        count += 1
      }
    }
    expect(count).toBe(63)
  })

  it('does not invent repeat cooperation after a declined first invitation', () => {
    const followup = V3_STORY_EVENTS.find(event => event.id === 'V3_C01B_LOCAL_CAR_RETURN')!
    for (const choice of followup.choices) {
      const line = careerPosterStoryLine({
        ...base, id: 'C01', completed: true,
        originalChoiceTitle: '礼貌婉拒这次合作',
        followupChoiceTitle: choice.title, followupWindowIndex: 28,
      })
      expect(line).toMatch(/本地代步品牌.*新邀约/)
      expect(line).not.toMatch(/再次.*(参加|接受|完成)|续约|长期合作/)
    }
  })

  it('supports all legacy bottle choices without inventing a sponsor conflict', () => {
    for (const choice of LEGACY_PRESS_DRINK_EVENT.choices) {
      const line = careerPosterStoryLine({ ...base, id: 'V3_E01_PRESS_DRINK:12', originalChoiceTitle: choice.title })
      expect(line).not.toMatch(/赞助|竞品|承诺|收入|退款/)
      expect(line).not.toBe('你在球场之外作出了一次属于自己的选择。')
    }
  })

  it('uses only the recorded first choice when a chain expires or remains open', () => {
    const story = { ...base, followupChoiceTitle: '多留些时间，听他说完', followupWindowIndex: 28 }
    expect(careerPosterStoryLine(story)).toBe('年轻队友拿来训练笔记时，你约好每周简短交流，把经验慢慢讲给后来的人。')
    expect(careerPosterMemories([story])[0]?.windowIndex).toBe(26)
  })

  it('reflects completed follow-up and its actual date without asserting mentoring success', () => {
    const story = { ...base, completed: true, followupChoiceTitle: '多留些时间，听他说完', followupWindowIndex: 28 }
    expect(careerPosterStoryLine(story)).toBe('年轻队友再次拿来训练笔记时，你耐心听完他的困惑，让彼此更熟悉。')
    expect(careerPosterMemories([story])[0]?.windowIndex).toBe(28)
    expect(careerPosterStoryLine(story)).not.toMatch(/成才|冠军|成功|进球|出场/)
  })

  it('never claims participation after a declined hometown invitation', () => {
    expect(careerPosterStoryLine({ ...base, id: 'C04', originalChoiceTitle: '诚恳说明这次无法参与' }))
      .toBe('你提前婉拒家乡训练营的邀请，诚恳说明无法参与，没有让对方空等。')
  })

  it('ignores untrusted or legacy operational summaries and unknown choice wording', () => {
    const story = { ...base, id: 'UNKNOWN:4', originalChoiceTitle: '订购服务退款通知：€1000' }
    expect(careerPosterStoryLine(story)).not.toMatch(forbidden)
    expect(careerPosterStoryLine({ ...base, originalChoiceTitle: '新版尚未识别的选择' })).not.toMatch(forbidden)
    expect(careerPosterStoryLine({ ...base, summary: '全世界都知道你拿了世界杯' })).toBe(careerPosterStoryLine(base))
  })

  it('is pure, preserves order and handles no stories without fabricating a memory', () => {
    const before = JSON.stringify(base)
    expect(careerPosterMemories([])).toEqual([])
    const memories = careerPosterMemories([base, { ...base, id: 'UNKNOWN:1', windowIndex: 30 }])
    expect(memories.map(memory => memory.id)).toEqual(['C03', 'UNKNOWN:1'])
    expect(JSON.stringify(base)).toBe(before)
    expect(memories[0]).toEqual({ id: 'C03', windowIndex: 26, text: careerPosterStoryLine(base) })
  })
})
