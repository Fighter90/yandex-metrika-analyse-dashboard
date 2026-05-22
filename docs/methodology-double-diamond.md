# Методология: Double Diamond

Double Diamond — на верхнем уровне процесса; методология проверки гипотез
(`methodology-hypotheses.md`) — внутри фаз Define и Develop.

| Фаза         | Что происходит                                               | Инструмент в проекте                                                     |
| ------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| **Discover** | автосбор данных Метрики, авто-находки (аномалии, weak spots) | `pnpm sync`, дашборд                                                     |
| **Define**   | problem-гипотезы по структурированному формату + ICE         | `.claude/skills/hypothesis-check/`, страница Hypotheses                  |
| **Develop**  | solution-гипотезы к каждой problem, тот же формат + ICE      | `.claude/skills/hypothesis-check/`                                       |
| **Deliver**  | проверка top-N → Decision Log → action plan                  | `.claude/skills/synthetic-custdev/`, `decision-log/`, страница Decisions |

## Замкнутый цикл

```
CLAUDE.md (контекст продукта)
  → Discover (данные дашборда)
  → Define (problem hypothesis: формат + допущения + методы + критерии + ICE + дедлайн)
  → Develop (solution hypothesis: тот же шаблон)
  → Проверка (synthetic CustDev / quantitative / market scan)
  → Decision Log (green/yellow/red + цитаты + next step)
  → Обновление CLAUDE.md (3 последних DL в контексте)
  → новый цикл
```

Гипотеза без всех 4 шагов считается недокументированной и **в отчёт не попадает**.
