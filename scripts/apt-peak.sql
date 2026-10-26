-- Equivalent read-only SQL reference; the production export uses fixed PostgREST queries.
-- ROUND matches bt_aggcur.ab. Run only once peak-period collection is complete,
-- and inspect err tasks as well as todo tasks before accepting the data.
SELECT status, count(*) FROM bt_tasks
WHERE ym >= '202107' AND ym <= '202206'
GROUP BY status ORDER BY status;

WITH ranked AS (
  SELECT sgg, dong, name, round(area / 5) * 5 AS ab, amount,
         row_number() OVER (
           PARTITION BY sgg, dong, name, round(area / 5) * 5
           ORDER BY amount DESC
         ) AS rn
  FROM bt_apt_trades
  WHERE deal_date >= '2021-07-01' AND deal_date < '2022-07-01'
    AND canceled IS NOT TRUE AND amount > 0 AND area > 0
), peaks AS (
  SELECT sgg, dong, name, ab, avg(amount::numeric) AS peak
  FROM ranked WHERE rn <= 3
  GROUP BY sgg, dong, name, ab HAVING count(*) >= 2
), ratios AS (
  SELECT c.sgg, c.dong, c.name,
         sum((c.cur::numeric / p.peak) * c.n) / sum(c.n) AS r
  FROM bt_aggcur c JOIN peaks p USING (sgg, dong, name, ab)
  WHERE c.cur > 0 AND c.n > 0
  GROUP BY c.sgg, c.dong, c.name
)
-- Preserve sgg here: audit name|dong collisions before generating the JS map.
SELECT sgg, name, dong, r FROM ratios WHERE r >= 0.95
ORDER BY name, dong, sgg;
