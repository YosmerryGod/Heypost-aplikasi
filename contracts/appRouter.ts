import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";

// Kontrak tipe frontend untuk API heypost. Modul ini hanya diimpor sebagai tipe
// dan tidak menjadi bagian dari bundle browser atau implementasi server.
const t = initTRPC.create({ transformer: superjson });
const procedure = t.procedure;
const typeOnly = () => { throw new Error("Kontrak tipe tidak dapat dijalankan"); };

const role = z.enum(["owner", "manager", "kasir", "lainnya"]);
const employeeRole = z.enum(["manager", "kasir", "lainnya"]);
const permission = z.enum(["pos.access", "history.daily.view", "invoice.edit", "expenses.daily.create", "expenses.daily.view", "menu.create", "menu.edit", "stock.edit", "reports.sales.view", "outlets.create", "employees.create", "receipt.settings", "expenses.daily.cancel", "transactions.cancel", "outlets.manage", "employees.manage", "payment.settings", "store.settings", "printer.settings", "outlets.view", "outlets.edit", "outlets.deactivate", "outlets.assign", "outlets.view_all", "employees.view", "employees.edit", "employees.deactivate", "employees.role.manage", "employees.permissions.manage", "employees.pin.reset", "employees.outlet.assign"]);
// [ADDED] Peta hak akses berdasarkan ID outlet.
const outletPermissions = z.record(z.string(), z.array(permission));
const store = z.object({ id: z.number(), name: z.string(), logoUrl: z.string().nullable(), createdAt: z.date(), updatedAt: z.date() });
const outlet = z.object({
  id: z.number(), storeId: z.number(), name: z.string(), address: z.string().nullable(),
  whatsappNumber: z.string().nullable(), whatsappUseMain: z.boolean(), openingTime: z.string(), closingTime: z.string(), timezone: z.string(), active: z.boolean(), createdAt: z.date(), updatedAt: z.date(),
});
const receiptSettings = z.object({
  id: z.number(), storeId: z.number(), showLogo: z.boolean(), showStoreName: z.boolean(),
  showOutletName: z.boolean(), showAddress: z.boolean(), showWhatsapp: z.boolean(),
  showCashier: z.boolean(), showCustomer: z.boolean(), showHeyPostWatermark: z.boolean(),
  footerMessage: z.string().nullable(), createdAt: z.date(), updatedAt: z.date(),
});
const authPayload = z.object({
  principal: z.object({
    name: z.string(), customTitle: z.string().nullable(), email: z.string().nullable(), avatarUrl: z.string().nullable(), // [ADDED] Foto profil akun owner.
    googleLinked: z.boolean(), hasPassword: z.boolean(), // [ADDED] Status metode autentikasi akun owner.
    role, // [ADDED] Peran principal dikembalikan backend dan dipakai untuk kontrol akses UI.
    userId: z.number().nullable(), employeeId: z.number().nullable(), permissions: z.array(permission), outletPermissions, assignedOutletIds: z.array(z.number()), // [ADDED]
  }),
  store,
  outlets: z.array(outlet),
  activeOutletId: z.number(),
});
const category = z.object({ id: z.number(), name: z.string(), sortOrder: z.number() });
const product = z.object({
  id: z.number(), categoryId: z.number(), name: z.string(), sku: z.string(),
  price: z.number(), stock: z.number(), imageUrl: z.string().nullable(), active: z.boolean(), createdAt: z.date(),
});
const productInput = z.object({
  name: z.string(), categoryId: z.number(), price: z.number(), stock: z.number(), imageUrl: z.string().nullable(),
});
const orderType = z.enum(["Makan di tempat", "Bawa pulang", "Pesan antar"]);
const paymentMethod = z.enum(["Tunai", "QRIS", "Kartu", "Transfer"]);
const saleItem = z.object({ productName: z.string(), unitPrice: z.number(), quantity: z.number(), subtotal: z.number() });
const transaction = z.object({
  id: z.number(), invoiceNumber: z.string(), customerName: z.string().nullable(),
  orderType, paymentMethod, status: z.enum(["Selesai", "Dibatalkan"]),
  subtotal: z.number(), discount: z.number(), total: z.number(), cashReceived: z.number().nullable(), paymentProofUrl: z.string().nullable(), createdAt: z.date(),
});
const transactionItem = saleItem.extend({ id: z.number(), transactionId: z.number(), productId: z.number() });
const employee = z.object({
  id: z.number(), name: z.string(), role: employeeRole, customTitle: z.string().nullable(), outletId: z.number(), outletIds: z.array(z.number()), outletNames: z.array(z.object({ id: z.number(), name: z.string() })), outletName: z.string(),
  active: z.boolean(), permissions: z.array(permission), outletPermissions, lockedUntil: z.date().nullable(), lastLoginAt: z.date().nullable(), createdAt: z.date(),
});
const summary = z.object({
  revenue: z.number(), orders: z.number(), itemsSold: z.number(), average: z.number(),
  daily: z.array(z.object({ date: z.string(), label: z.string(), revenue: z.number(), orders: z.number() })),
  topProducts: z.array(z.object({ name: z.string(), quantity: z.number(), revenue: z.number() })),
  payments: z.array(z.object({ method: z.string(), total: z.number() })),
});
const expense = z.object({
  id: z.number(), storeId: z.number(), outletId: z.number(), userId: z.number().nullable(),
  employeeId: z.number().nullable(), category: z.string(), description: z.string().nullable(),
  amount: z.number(), paymentMethod, expenseDate: z.string(), status: z.enum(["Aktif", "Dibatalkan"]), createdAt: z.date(),
});

export const appRouter = t.router({
  auth: t.router({
    register: procedure.input(z.object({
      name: z.string(), storeName: z.string(), outletName: z.string().optional(),
      email: z.string(), password: z.string(),
    })).output(authPayload).mutation(typeOnly),
    login: procedure.input(z.object({ email: z.string(), password: z.string() })).output(authPayload).mutation(typeOnly),
    employeeLogin: procedure.input(z.object({ barcode: z.string(), pin: z.string() })).output(authPayload).mutation(typeOnly),
    me: procedure.output(authPayload.nullable()).query(typeOnly),
    // [ADDED] Pengelolaan profil pribadi owner, terpisah dari pengaturan toko.
    updateAccount: procedure.input(z.object({ name: z.string(), email: z.string(), currentPassword: z.string().optional() })).output(z.object({ ok: z.boolean() })).mutation(typeOnly),
    changePassword: procedure.input(z.object({ currentPassword: z.string(), newPassword: z.string() })).output(z.object({ ok: z.boolean() })).mutation(typeOnly),
    uploadAvatar: procedure.input(z.object({ dataUrl: z.string() })).output(z.object({ imageUrl: z.string() })).mutation(typeOnly),
    logout: procedure.output(z.object({ ok: z.boolean() })).mutation(typeOnly),
  }),
  store: t.router({
    updateProfile: procedure.input(z.object({
      name: z.string().optional(), logoUrl: z.string().url().nullable().optional(),
    })).output(z.object({ ok: z.boolean() })).mutation(typeOnly),
    uploadLogo: procedure.input(z.object({ dataUrl: z.string() })).output(z.object({ imageUrl: z.string() })).mutation(typeOnly),
    getReceiptSettings: procedure.output(receiptSettings).query(typeOnly),
    // [ADDED] Konfigurasi QRIS dan rekening bank per toko.
    getPaymentSettings: procedure.output(z.object({
      id: z.number(), storeId: z.number(), qrisEnabled: z.boolean(), transferEnabled: z.boolean(), qrisImageUrl: z.string().nullable(),
      qrisMerchantName: z.string().nullable(), qrisMerchantId: z.string().nullable(),
      bankAccounts: z.array(z.object({ id: z.string(), bankName: z.string(), accountName: z.string(), accountNumber: z.string() })),
      createdAt: z.date(), updatedAt: z.date(),
    })).query(typeOnly),
    uploadPaymentQr: procedure.input(z.object({ dataUrl: z.string() })).output(z.object({ imageUrl: z.string() })).mutation(typeOnly),
    updatePaymentSettings: procedure.input(z.object({
      qrisEnabled: z.boolean().optional(), transferEnabled: z.boolean().optional(),
      qrisMerchantName: z.string().nullable().optional(), qrisMerchantId: z.string().nullable().optional(),
      bankAccounts: z.array(z.object({ id: z.string(), bankName: z.string(), accountName: z.string(), accountNumber: z.string() })).max(20).optional(),
    })).output(z.object({ ok: z.boolean() })).mutation(typeOnly),

    updateReceiptSettings: procedure.input(z.object({
      showLogo: z.boolean().optional(), showStoreName: z.boolean().optional(),
      showOutletName: z.boolean().optional(), showAddress: z.boolean().optional(),
      showWhatsapp: z.boolean().optional(), showCashier: z.boolean().optional(),
      showCustomer: z.boolean().optional(), showHeyPostWatermark: z.boolean().optional(),
      footerMessage: z.string().max(300).nullable().optional(),
    })).output(receiptSettings).mutation(typeOnly),
    createOutlet: procedure.input(z.object({
      name: z.string(), address: z.string().optional(), whatsappNumber: z.string().nullable().optional(),
      whatsappUseMain: z.boolean().optional(), openingTime: z.string().optional(), closingTime: z.string().optional(), timezone: z.enum(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]).optional(),
      copyMenuFromOutletId: z.number().optional(),
    })).output(outlet).mutation(typeOnly),
    // [ADDED] Sinkronisasi mengganti katalog outlet tujuan dengan salinan outlet sumber.
    syncOutletMenu: procedure.input(z.object({ targetOutletId: z.number(), sourceOutletId: z.number() })).output(z.object({
      ok: z.boolean(), copiedCategories: z.number(), copiedProducts: z.number(),
    })).mutation(typeOnly),
    switchOutlet: procedure.input(z.object({ outletId: z.number() })).output(z.object({ ok: z.boolean(), activeOutletId: z.number() })).mutation(typeOnly),
    updateOutlet: procedure.input(z.object({
      id: z.number(), name: z.string().optional(), address: z.string().nullable().optional(),
      whatsappNumber: z.string().nullable().optional(), whatsappUseMain: z.boolean().optional(),
      openingTime: z.string().optional(), closingTime: z.string().optional(), timezone: z.enum(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]).optional(), active: z.boolean().optional(),
    })).output(z.object({ ok: z.boolean() })).mutation(typeOnly),
  }),
  employees: t.router({
    list: procedure.output(z.array(employee)).query(typeOnly),
    create: procedure.input(z.object({
      name: z.string(), role: employeeRole, customTitle: z.string().optional(), outletIds: z.array(z.number()), pin: z.string(), permissions: z.array(permission).optional(), outletPermissions: outletPermissions.optional(), // [ADDED]
    })).output(z.object({
      id: z.number(), name: z.string(), role: employeeRole, customTitle: z.string().nullable(), outletId: z.number(), outletIds: z.array(z.number()),
      active: z.boolean(), permissions: z.array(permission), outletPermissions, createdAt: z.date(), barcode: z.string(),
    })).mutation(typeOnly),
    update: procedure.input(z.object({
      id: z.number(), name: z.string().optional(), role: employeeRole.optional(), customTitle: z.string().nullable().optional(), outletIds: z.array(z.number()).optional(),
      active: z.boolean().optional(), pin: z.string().optional(), permissions: z.array(permission).optional(), outletPermissions: outletPermissions.optional(), // [ADDED]
    })).output(z.object({ ok: z.boolean() })).mutation(typeOnly),
    regenerateBarcode: procedure.input(z.object({ id: z.number() })).output(z.object({ barcode: z.string() })).mutation(typeOnly),
  }),
  pos: t.router({
    bootstrap: procedure.output(z.object({
      products: z.array(product), categories: z.array(category), outlet, role,
    })).query(typeOnly),
    listProducts: procedure.output(z.object({ products: z.array(product), categories: z.array(category) })).query(typeOnly),
    setProductActive: procedure.input(z.object({ id: z.number().int().positive(), active: z.boolean() })).output(product).mutation(typeOnly),
    createCategory: procedure.input(z.object({ name: z.string(), sortOrder: z.number().default(0) })).output(category).mutation(typeOnly),
    uploadProductImage: procedure.input(z.object({ dataUrl: z.string() })).output(z.object({ imageUrl: z.string() })).mutation(typeOnly),
    createProduct: procedure.input(productInput).output(product).mutation(typeOnly),
    updateProduct: procedure.input(productInput.extend({ id: z.number() })).output(product).mutation(typeOnly),
    archiveProduct: procedure.input(z.object({ id: z.number() })).output(z.object({ ok: z.boolean() })).mutation(typeOnly),
    createTransaction: procedure.input(z.object({
      customerName: z.string().optional(), orderType, paymentMethod,
      discount: z.number().default(0), cashReceived: z.number().optional(), paymentProofDataUrl: z.string().optional(),
      items: z.array(z.object({ productId: z.number(), quantity: z.number() })),
    })).output(transaction.extend({ items: z.array(saleItem) })).mutation(typeOnly),
    updateTransaction: procedure.input(z.object({
      id: z.number(), customerName: z.string().optional(), orderType, paymentMethod,
      discount: z.number(), cashReceived: z.number().optional(),
      items: z.array(z.object({ productId: z.number(), quantity: z.number() })),
    })).output(transaction.extend({ items: z.array(transactionItem) })).mutation(typeOnly),
    cancelTransaction: procedure.input(z.object({ id: z.number() })).output(z.object({
      ok: z.boolean(), status: z.enum(["Selesai", "Dibatalkan"]),
    })).mutation(typeOnly),
    transactions: procedure.output(z.array(transaction.extend({ items: z.array(transactionItem) }))).query(typeOnly),
    summary: procedure.input(z.object({
      range: z.enum(["today", "week", "month", "all"]).default("week"), allOutlets: z.boolean().default(false),
    })).output(summary).query(typeOnly),
  }),
  expenses: t.router({
    list: procedure.input(z.object({ fromDate: z.string().optional(), toDate: z.string().optional() }).optional()).output(z.array(expense)).query(typeOnly),
    create: procedure.input(z.object({
      category: z.string(), description: z.string().optional(), amount: z.number(),
      paymentMethod, expenseDate: z.string(),
    })).output(expense).mutation(typeOnly),
    cancel: procedure.input(z.object({ id: z.number().int().positive() })).output(z.object({
      ok: z.boolean(), status: z.enum(["Aktif", "Dibatalkan"]),
    })).mutation(typeOnly),
  }),
});

export type AppRouter = typeof appRouter;
