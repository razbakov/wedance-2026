# SDTV — Monday.com Board Blueprint

last_updated: 2026-04-07
source: founder operational framework
status: REFERENCE ONLY — founder already has Monday structure, not yet tested on real festival

## IMPORTANT — OPERATING PRINCIPLE

Monday НЕ проектируется окончательно. Валидируется об реальную работу.

Правильные вопросы при review:
- Что реально помогает двигать сделку и delivery?
- Что тормозит?
- Чего не хватает в моменте?
- Что оказалось декоративным?
- Что приходится дублировать вручную?
- Где теряется контроль?

### 5 критериев оценки (после каждого реального прогона):

1. **Сделка** — удалось ли вести клиента от интереса до подтверждения без хаоса?
2. **Подготовка** — понятно ли из борда что подтверждено, что висит, что срочно?
3. **Delivery** — можно ли после фестиваля без паники понять что обещано, что отдано, что нет?
4. **Renewal / future value** — остаётся ли после проекта база для следующего касания, апсейла, renewal?
5. **Нагрузка на двоих** — три фильтра:
   - **Контроль:** понимаете ли вы в любой момент что происходит по фестивалю?
   - **Скорость:** можно ли быстро обновить и быстро понять next step?
   - **Внимание:** не превращается ли система в отдельную работу?

**Баланс:** не всякая нагрузка плохая.

Полезная нагрузка (ОК):
- Зафиксировать следующий шаг
- Отметить что продано
- Держать дедлайны delivery
- Не потерять renewal
- Видеть где деньги и где риск

Вредная нагрузка (убирать):
- Одна инфа в 3 местах
- Поля "на всякий случай"
- Статусы которые никто не обновляет
- Ручные действия без которых система разваливается
- Сложность без решений, денег или контроля

**Формула:** CRM должна давать контроль, ускорять действия, не требовать чрезмерного обслуживания.

### Мини-правило для команды из 2 человек

CRM хороша если:
- Запись/обновление < 1-2 минуты
- Next step виден сразу
- Одну инфу не надо писать повторно
- Weekly review проходит быстро
- После паузы в 3-4 дня можно открыть board и сразу понять контекст

Если нет → friction слишком высокий.

### 5 вопросов после пилотного фестиваля

1. Без этого board было бы сильно труднее?
2. Помог принять хотя бы 3 важных решения по ходу проекта?
3. Помог не забыть хотя бы 2 важных действия?
4. Обновление занимало разумное время?
5. После фестиваля понятно что продано, что доставлено, что дальше?

Большинство "да" = система работает. Большинство "нет" = пока декоративная.

### Поля которые кажутся лишними но спасают
- renewal window
- margin / profitability
- owner
- delivery due date
- status: обещано vs доставлено

Цель не максимально лёгкая CRM, а **достаточно лёгкая для жизни и достаточно сильная для управления**.

### Эволюционный подход (НЕ big bang redesign)

**Этап 1:** Текущая структура = гипотеза, не истина. Ничего резко не перестраиваем.
**Этап 2:** Прогон одного фестиваля end-to-end (контакт → подготовка → onsite → delivery → follow-up → renewal/upsell).
**Этап 3:** Фиксируем ТОЛЬКО реальные боли:
- Без этого поля потеряли информацию
- Без этого статуса забыли действие
- Из-за этой логики ушли в Telegram/WhatsApp/заметки
- В board не видно что проект завис
- Отчётность по деньгам/deliverables не собирается
- Renewal window не отслеживается

**Этап 4:** Правило изменений:
- 1 раз неудобно = заметили
- 2 раза повторилось = обсуждаем
- 3 раза повторилось = меняем систему

### Тест для каждого поля (3 вопроса)

1. Помогает принять решение? (продолжать переговоры, готов ли клиент, что просрочено)
2. Запускает действие? (follow-up, invoice, confirm travel, send recap, open renewal)
3. Нужно для отчёта или KPI? (promo revenue, renewal rate, margin, on-time delivery)

**Если нет на все 3 → поле декоративное. Убрать.**

### Что отслеживать во время пилота (журнал трения)

Можно отдельной заметкой, не обязательно новыми полями:
- Где не хватило прозрачности
- Где были лишние поля
- Что дублировалось
- Что неясно по статусам
- Где потерялась ответственность
- Где непонятно: продано или только обсуждается
- Где сложно понять next step
- Где теряется связь фестиваль ↔ deliverables
- Где неудобно готовить renewal / next offer

### Режим работы

`Текущая структура → пилотный фестиваль → журнал трения → точечные правки → второй прогон`

После второго прогона уже можно уверенно сказать: какие поля must-have, что убрать, какие автоматизации нужны, какие board relations полезны а какие грузят.

Blueprint ниже = РЕФЕРЕНС для сравнения с текущей структурой, не шаблон.

## Board A: Clients / Festivals

### Columns
- Client Name
- Client Type
- Renewal Eligible (yes/no)
- Renewal Window (date range)
- Renewal Status (Eligible / Renewal Open / Renewed / Lost)
- 12M Revenue (number)
- Last Event Date
- Next Opportunity (date)
- Package Type
- Promo Included? (yes/no)
- Remote Eligible? (yes/no)
- Notes

### KPIs derived:
- Client Renewal Rate
- Average 12-Month Client Value

## Board B: Deals / Pipeline

### Columns
- Lead / Deal Name
- Source
- Inbound / Outbound
- Qualified? (yes/no)
- Deal Stage (Warm Lead / Qualified Discovery / Proposal Sent / Verbal Yes / Booked / Lost)
- Weighted Value (formula: deal value × stage weight)
- Expected Close Date
- Product Type (Promo / Production / Hybrid)
- Requires Onsite? (yes/no)
- Owner
- Next Follow-up Date

### Stage Weights for Pipeline
- Warm lead: 20%
- Qualified discovery: 40%
- Proposal sent: 60%
- Verbal yes / negotiation: 80%
- Booked: 100%

### KPIs derived:
- Qualified Inbound Opportunities / Month
- Pipeline Coverage Ratio

## Board C: Orders / Delivery

### Columns
- Order Name
- Client (linked)
- Product Type (Promo / Production / Hybrid)
- Delivery Due Date
- Delivered Date
- On Time? (formula)
- Editor Cost
- Designer Cost
- Travel Cost
- Other Direct Cost
- Revenue
- Gross Margin % (formula)
- Impact Report Sent? (yes/no)

### KPIs derived:
- Gross Margin %
- On-Time Delivery Rate
- Part of Promo Revenue

## Board D: KPI Scorecard

One row per KPI. Very simple.

### Columns
- KPI Name
- This Month
- Quarter to Date
- Last Month
- Target
- Status (Green / Yellow / Red)
- Owner
- Comment
- Action Needed?

## Notion: Executive Scoreboard (1 page)

NOT a CRM duplicate. Executive layer only.

### Blocks:
1. **North Star** — Promo-Led Revenue: current month, quarter, YTD, vs 2025 baseline
2. **8 KPI cards** — current value, target range, trend (up/flat/down), short comment
3. **Monthly interpretation** — what improved, what slipped, what to fix
4. **Strategic risks** — onsite dependency, renewal weakness, low margin, delivery overload
5. **Decisions taken** — pricing changes, renewal sequence updates, editor SLA, offer renames

## Dependencies

To build these boards we need from founder:
- Current client list (see marco/sdtv-pending-inputs.md)
- Current offers/pricing
- 2025 revenue data for baselines
- Channel metrics for impact report capability
