type Range = "today" | "week" | "month" | "all";
const ranges: { value: Range; label: string }[] = [
  { value: "today", label: "Hari ini" },
  { value: "week", label: "7 hari" },
  { value: "month", label: "30 hari" },
  { value: "all", label: "Semua" },
];

export default function ReportsScreen() {
  const session = trpc.auth.me.useQuery();
  const [range, setRange] = useState<Range>("week");
  const [allOutlets, setAllOutlets] = useState(false);
  const query = trpc.pos.summary.useQuery({ range, allOutlets });

  if (query.isLoading) return <AppScreen><LoadingState /></AppScreen>;
  if (query.error) return <AppScreen><ErrorState message={query.error.message} retry={() => void query.refetch()} /></AppScreen>;
  const data = query.data;
  if (!data) return <AppScreen><EmptyState title="Belum ada laporan" description="Data penjualan akan muncul setelah transaksi berhasil." /></AppScreen>;

  const maxRevenue = Math.max(1, ...data.daily.map((day) => day.revenue));
  const last = data.daily.at(-1)?.revenue ?? 0;
  const previous = data.daily.at(-2)?.revenue ?? 0;
  const trend = previous ? Math.round(((last - previous) / previous) * 100) : 0;

  return (
    <AppScreen>
      <PageHeading eyebrow="PERFORMA BISNIS" title="Laporan penjualan" subtitle="Baca performa penjualan pada periode terpilih." />
      <View style={s.controls}>
        <View style={s.segmented}>
          {ranges.map((item) => <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: range === item.value }} onPress={() => setRange(item.value)} style={[s.segment, range === item.value && s.segmentActive]}><Text style={[s.segmentText, range === item.value && s.segmentTextActive]}>{item.label}</Text></Pressable>)}
        </View>
        {session.data?.principal.role === "owner" ? <View style={s.scope}>
          <Pressable onPress={() => setAllOutlets(false)} style={[s.scopeButton, !allOutlets && s.scopeActive]}><Text style={[s.scopeText, !allOutlets && s.scopeTextActive]}>Outlet ini</Text></Pressable>
          <Pressable onPress={() => setAllOutlets(true)} style={[s.scopeButton, allOutlets && s.scopeActive]}><Text style={[s.scopeText, allOutlets && s.scopeTextActive]}>Semua outlet</Text></Pressable>
        </View> : null}
      </View>
      <View style={s.metricGrid}>
        <Panel style={s.primaryMetric}>
          <Text style={s.primaryLabel}>Penjualan kotor</Text>
          <Text style={s.primaryValue}>{formatRupiah(data.revenue)}</Text>
          <Text style={s.primaryFoot}>{trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}% dari hari sebelumnya</Text>
        </Panel>
        <View style={s.metricRow}>
          <Panel style={s.metric}><Text style={s.metricLabel}>Transaksi</Text><Text style={s.metricValue}>{data.orders}</Text><Text style={s.metricFoot}>Pesanan selesai</Text></Panel>
          <Panel style={s.metric}><Text style={s.metricLabel}>Produk terjual</Text><Text style={s.metricValue}>{data.itemsSold}</Text><Text style={s.metricFoot}>Total unit</Text></Panel>
        </View>
        <Panel style={s.averageMetric}><Text style={s.metricLabel}>Rata-rata transaksi</Text><Text style={s.averageValue}>{formatRupiah(data.average)}</Text></Panel>
      </View>

      <Panel style={s.chartPanel}>
        <View style={s.sectionHeading}><View><Text style={s.sectionTitle}>Tren penjualan</Text><Text style={s.sectionSubtitle}>Pendapatan harian pada periode terpilih</Text></View><View style={s.legend}><View style={s.legendDot} /><Text style={s.metricLabel}>Penjualan</Text></View></View>
        {data.daily.length ? data.daily.map((day) => <View key={day.date} style={s.chartRow}>
          <View style={s.chartLabel}><Text style={s.dayLabel}>{day.label}</Text><Text style={s.chartValue}>{formatRupiah(day.revenue)}</Text></View>
          <View style={s.track}><View style={[s.bar, { width: `${Math.max(2, day.revenue / maxRevenue * 100)}%` }]} /></View>
        </View>) : <EmptyState title="Belum ada penjualan" />}
      </Panel>

      <Panel style={s.chartPanel}>
        <View style={s.sectionHeading}><View><Text style={s.sectionTitle}>Metode pembayaran</Text><Text style={s.sectionSubtitle}>Kontribusi terhadap penjualan</Text></View></View>
        {data.payments.length ? data.payments.map((payment) => <View key={payment.method} style={s.paymentRow}>
          <View style={s.paymentHeading}><Text style={s.paymentName}>{payment.method}</Text><Text style={s.paymentTotal}>{formatRupiah(payment.total)}</Text></View>
          <View style={s.track}><View style={[s.bar, { width: `${data.revenue ? Math.max(2, payment.total / data.revenue * 100) : 0}%` }]} /></View>
          <Text style={s.metricFoot}>{data.revenue ? Math.round(payment.total / data.revenue * 100) : 0}% dari penjualan</Text>
        </View>) : <EmptyState title="Belum ada pembayaran" />}
      </Panel>

      <Panel style={s.chartPanel}>
        <View style={s.sectionHeading}><View><Text style={s.sectionTitle}>Produk terlaris</Text><Text style={s.sectionSubtitle}>Berdasarkan nilai penjualan pada periode ini</Text></View></View>
        {data.topProducts.length ? data.topProducts.map((product, index) => <View key={product.name} style={s.topProduct}>
          <Text style={s.rank}>{String(index + 1).padStart(2, "0")}</Text>
          <View style={s.topProductCopy}><Text numberOfLines={1} style={s.paymentName}>{product.name}</Text><Text style={s.metricFoot}>{product.quantity} unit terjual</Text></View>
          <Text style={s.topRevenue}>{formatRupiah(product.revenue)}</Text>
        </View>) : <EmptyState title="Belum ada produk terjual" />}
      </Panel>
    </AppScreen>
  );
}

const s = StyleSheet.create({
  controls: { gap: 10 },
  segmented: { flexDirection: "row", padding: 4, borderWidth: 1, borderColor: theme.colors.line, borderRadius: 11, backgroundColor: theme.colors.surface, gap: 3 },
  segment: { flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  segmentActive: { backgroundColor: theme.colors.signal },
  segmentText: { color: theme.colors.muted, fontSize: 12, fontWeight: "700" },
  segmentTextActive: { color: "#fff" },
  scope: { flexDirection: "row", alignSelf: "flex-start", padding: 3, borderRadius: 9, backgroundColor: "#eaf1ec", gap: 3 },
  scopeButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 7 },
  scopeActive: { backgroundColor: "#fff", borderWidth: 1, borderColor: theme.colors.line },
  scopeText: { color: theme.colors.muted, fontSize: 11, fontWeight: "700" },
  scopeTextActive: { color: theme.colors.signal },
  metricGrid: { gap: 9 },
  primaryMetric: { backgroundColor: theme.colors.signal, borderColor: theme.colors.signal, paddingVertical: 20 },
  primaryLabel: { color: "#e0f5e9", fontSize: 12, fontWeight: "600" },
  primaryValue: { color: "#fff", fontFamily: "Archivo-ExtraBold", fontSize: 27, marginTop: 7 },
  primaryFoot: { color: "#e0f5e9", fontSize: 11, marginTop: 7 },
  metricRow: { flexDirection: "row", gap: 9 },
  metric: { flex: 1, minWidth: 0, gap: 5 },
  metricLabel: { color: theme.colors.muted, fontSize: 11 },
  metricValue: { color: theme.colors.ink, fontFamily: "Archivo-Bold", fontSize: 23 },
  metricFoot: { color: theme.colors.muted, fontSize: 10 },
  averageMetric: { gap: 5 },
  averageValue: { color: theme.colors.ink, fontFamily: "Archivo-Bold", fontSize: 22 },
  chartPanel: { padding: 16 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 },
  sectionTitle: { color: theme.colors.ink, fontFamily: "Archivo-Bold", fontSize: 16 },
  sectionSubtitle: { color: theme.colors.muted, fontSize: 11, marginTop: 3 },
  legend: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.signal },
  chartRow: { gap: 6, marginTop: 10 },
  chartLabel: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  dayLabel: { color: theme.colors.muted, fontSize: 11 },
  chartValue: { color: theme.colors.ink, fontSize: 11, fontWeight: "700" },
  track: { height: 7, borderRadius: 7, backgroundColor: "#eaf0ec", overflow: "hidden" },
  bar: { height: 7, borderRadius: 7, backgroundColor: theme.colors.signal },
  paymentRow: { gap: 7, marginTop: 12 },
  paymentHeading: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  paymentName: { color: theme.colors.ink, fontSize: 13, fontWeight: "700" },
  paymentTotal: { color: theme.colors.ink, fontSize: 12, fontWeight: "800" },
  topProduct: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 11, borderTopWidth: 1, borderTopColor: theme.colors.line },
  rank: { color: theme.colors.muted, fontFamily: "Archivo-Bold", fontSize: 12, width: 24 },
  topProductCopy: { flex: 1, minWidth: 0, gap: 3 },
  topRevenue: { color: theme.colors.ink, fontSize: 12, fontWeight: "800" },
});