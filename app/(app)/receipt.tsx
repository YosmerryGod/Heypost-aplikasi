import { showToast } from "@/components/native-ui"; // [ADDED] Feedback visual HeyPost.
// [ADDED] Pengaturan struk dengan pratinjau dan penyimpanan terhubung backend.
import { useEffect, useMemo, useRef, useState } from "react";
import { useColorScheme } from "react-native";
import { getTheme, type ThemeColors } from "@/constants/theme";
import { Image, PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { EscPosPrinter } from "rn-escpos-printer";
import { trpc } from "@/providers/trpc";
import Svg from "react-native-svg";
import ReceiptPrintCanvas from "@/components/receipt-print-canvas";

type ReceiptKey = "showLogo"|"showStoreName"|"showOutletName"|"showAddress"|"showWhatsapp"|"showCashier"|"showCustomer"|"showHeyPostWatermark";
const fields:{key:ReceiptKey;label:string}[]=[{key:"showLogo",label:"Logo toko"},{key:"showStoreName",label:"Nama toko"},{key:"showOutletName",label:"Nama outlet"},{key:"showAddress",label:"Alamat outlet"},{key:"showWhatsapp",label:"WhatsApp outlet"},{key:"showCashier",label:"Nama kasir"},{key:"showCustomer",label:"Nama pelanggan"},{key:"showHeyPostWatermark",label:"Watermark HeyPost"}];
const money=(value:number)=>`Rp${value.toLocaleString("id-ID")}`;
const PRINTER_STORAGE_KEY = "heypost.printer.preferences";

export default function ReceiptSettingsScreen(){
 const colorScheme=useColorScheme(); const colors=useMemo(()=>getTheme(colorScheme==="dark").colors,[colorScheme]); const s=useMemo(()=>createStyles(colors),[colors]);
 const utils=trpc.useUtils(); const session=trpc.auth.me.useQuery(); const query=trpc.store.getReceiptSettings.useQuery();
 const [values,setValues]=useState<Record<ReceiptKey,boolean>>({showLogo:true,showStoreName:true,showOutletName:true,showAddress:true,showWhatsapp:true,showCashier:true,showCustomer:true,showHeyPostWatermark:true});
 const [footer,setFooter]=useState("Terima Kasih Sudah Pesan"); const [logo,setLogo]=useState<string|null>(null); const [dirty,setDirty]=useState(false);
 const [testingPrint,setTestingPrint]=useState(false);
 const receiptSvgRef=useRef<Svg>(null);
 useEffect(()=>{if(query.data&&!dirty){setValues({showLogo:query.data.showLogo,showStoreName:query.data.showStoreName,showOutletName:query.data.showOutletName,showAddress:query.data.showAddress,showWhatsapp:query.data.showWhatsapp,showCashier:query.data.showCashier,showCustomer:query.data.showCustomer,showHeyPostWatermark:query.data.showHeyPostWatermark});setFooter(query.data.footerMessage??"");}},[query.data,dirty]);
 const save=trpc.store.updateReceiptSettings.useMutation({onSuccess:async()=>{setDirty(false);await utils.store.getReceiptSettings.invalidate();showToast("Tersimpan", "Pengaturan struk berhasil disimpan.", "success");},onError:e=>showToast("Gagal menyimpan", e.message, "error")});
 const upload=trpc.store.uploadLogo.useMutation({onSuccess:async result=>{setLogo(result.imageUrl);await utils.auth.me.invalidate();showToast("Logo diperbarui", "Logo toko berhasil diunggah.", "success");},onError:e=>showToast("Upload gagal", e.message, "error")});
 const store=session.data?.store; const outlet=session.data?.outlets.find(o=>o.id===session.data?.activeOutletId); const cashier=session.data?.principal.name??"Nama kasir";
 const logoUrl=logo??store?.logoUrl??null;
 const footerLines=footer.trim().match(/.{1,38}(?:\s|$)/g)?.map(line=>line.trim())??[];
 const hasAddress=Boolean(values.showAddress&&outlet?.address);
 const hasWhatsapp=Boolean(values.showWhatsapp&&outlet?.whatsappNumber);
 const footerStartY=hasAddress||hasWhatsapp?590+(hasAddress?25:0)+(hasWhatsapp?25:0):590;
 const watermarkY=footerStartY+footerLines.length*23+12;
 const printHeight=(values.showHeyPostWatermark?watermarkY+28:footerLines.length?footerStartY+(footerLines.length-1)*23+28:hasAddress||hasWhatsapp?footerStartY+28:550);
 const toggle=(key:ReceiptKey)=>{setDirty(true);setValues(current=>({...current,[key]:!current[key]}));};
 const testReceiptPrint=async()=>{
  if(testingPrint)return;
  setTestingPrint(true);
  try{
   if(Platform.OS==="android"&&Number(Platform.Version)>=31){
    const permission=PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT;
    if(permission&&!await PermissionsAndroid.check(permission)){
     showToast("Pemberitahuan", "Izin Bluetooth diperlukan. Hubungkan printer terlebih dahulu.", "info");
     router.push("/(app)/printer");
     return;
    }
   }
   await EscPosPrinter.initialize();
   if(!(await EscPosPrinter.isConnected())){
    if(Platform.OS==="android")showToast("Pemberitahuan", "Printer belum terhubung. Hubungkan printer terlebih dahulu.", "info");
    router.push("/(app)/printer");
    return;
   }
   const stored=await SecureStore.getItemAsync(PRINTER_STORAGE_KEY);
   let paperWidth:58|80=58;
   if(stored){try{if(JSON.parse(stored).paperWidth==="80")paperWidth=80;}catch{}}
   const svg=receiptSvgRef.current;
   if(!svg)throw new Error("Pratinjau struk belum siap. Coba lagi.");
   await new Promise<void>((resolve,reject)=>{
    svg.toDataURL(async(base64)=>{
     try{
      await EscPosPrinter.printImageBase64(base64,{paperWidth,threshold:170,feedLines:3,cut:true});
      resolve();
     }catch(error){reject(error);}
    });
   });
   showToast("Berhasil", "Struk uji berhasil dicetak sesuai tata letak pratinjau.", "success");
  }catch(error){
   const message=error instanceof Error?error.message:"Printer tidak dapat digunakan.";
   if(/BLUETOOTH_DISABLED|Bluetooth is disabled|BLUETOOTH_PERMISSION|permission has not been granted|NOT_CONNECTED|No printer is connected/i.test(message)){
    if(Platform.OS==="android")showToast("Pemberitahuan", "Aktifkan Bluetooth dan hubungkan printer terlebih dahulu.", "info");
    router.push("/(app)/printer");
   }else showToast("Gagal mencetak", message, "error");
  }finally{setTestingPrint(false);}
 };
 const chooseLogo=async()=>{const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!permission.granted){showToast("Izin diperlukan", "Izinkan akses galeri untuk memilih logo toko.", "error");return;}const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],allowsEditing:true,aspect:[1,1],quality:.82,base64:true});if(result.canceled||!result.assets[0]?.base64)return;const asset=result.assets[0];const mime=asset.mimeType??"image/jpeg";if(!["image/jpeg","image/png","image/webp"].includes(mime)){showToast("Format tidak didukung", "Gunakan JPG, PNG, atau WebP.", "error");return;}upload.mutate({dataUrl:`data:${mime};base64,${asset.base64}`});};
 const previewRows=useMemo(()=>[{key:"No. Transaksi",value:"CONTOH-0001"},{key:"Tanggal",value:"28/11/2026 15:15"},{key:"Kasir",value:cashier},{key:"Pelanggan",value:"Pelanggan toko"},{key:"Tipe pesanan",value:"Makan di tempat"},{key:"Pembayaran",value:"Tunai"}], [cashier]);
 return <SafeAreaView style={s.safe} edges={["top","left","right"]}>
  {/* [MODIFIED] Header mengikuti posisi aman dan tinggi header halaman lain. */}
  <View style={s.header}>
   <Pressable accessibilityRole="button" accessibilityLabel="Kembali ke pengaturan" onPress={()=>router.back()} style={s.headerIcon}><Ionicons name="arrow-back" size={22} color="#6B7280"/></Pressable>
   <Text style={s.headerTitle}>Pengaturan Struk</Text>
  </View>
  <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
   <View style={s.previewCard}><Text style={s.eyebrow}>PRATINJAU</Text><Text style={s.sectionTitle}>Hasil cetak struk</Text><View style={s.paper}>
    <View style={s.paperHeader}>
     {values.showLogo?(logoUrl?<Image source={{uri:logoUrl}} style={s.logo}/>:<View style={s.logoPlaceholder}><Ionicons name="storefront-outline" size={27} color="#F5B900"/></View>):null}
     <View style={s.paperHeaderCopy}>
      {values.showStoreName?<Text style={s.storeName}>{store?.name??"Nama toko"}</Text>:null}
      {values.showOutletName?<Text style={s.outlet}>{outlet?.name??"Nama outlet"}</Text>:null}
     </View>
    </View>
    <View style={s.dashed}/>{previewRows.filter(row=>row.key!=="Kasir"||values.showCashier).filter(row=>row.key!=="Pelanggan"||values.showCustomer).map(row=><View key={row.key} style={s.previewLine}><Text style={s.previewLabel}>{row.key}</Text><Text style={s.previewValue}>{row.key==="Kasir"?cashier:row.value}</Text></View>)}
    <View style={s.dashed}/><Text style={s.orderHeading}>DETAIL PESANAN</Text><View style={s.previewLine}><Text style={s.previewValue}>Contoh produk</Text><Text style={s.previewValue}>{money(25000)}</Text></View><Text style={s.quantity}>1 × {money(25000)}</Text><View style={s.dashed}/><View style={s.previewLine}><Text style={s.previewLabel}>Subtotal</Text><Text style={s.previewValue}>{money(25000)}</Text></View><View style={s.previewLine}><Text style={s.totalLabel}>TOTAL</Text><Text style={s.totalValue}>{money(25000)}</Text></View><View style={s.dashed}/>{values.showAddress&&outlet?.address?<Text style={s.footerDetail}>{outlet.address}</Text>:null}{values.showWhatsapp&&outlet?.whatsappNumber?<Text style={s.footerDetail}>{outlet.whatsappNumber}</Text>:null}{footer.trim()?<Text style={s.footerMessage}>{footer}</Text>:null}{values.showHeyPostWatermark?<Text style={s.watermark}>Powered by HeyPost</Text>:null}
   </View><Pressable style={[s.testButton,testingPrint&&{opacity:.65}]} disabled={testingPrint} onPress={()=>void testReceiptPrint()}><Ionicons name="print-outline" size={20} color="#FFFFFF"/><Text style={s.testButtonText}>{testingPrint?"Mengirim...":"Test Struk"}</Text></Pressable></View>
   <View style={s.logoCard}>{logoUrl?<Image source={{uri:logoUrl}} style={s.logoThumb}/>:<View style={s.logoThumbPlaceholder}><Ionicons name="image-outline" size={24} color="#87938C"/></View>}<View style={{flex:1,gap:4}}><Text style={s.logoTitle}>Logo toko</Text><Text style={s.helper}>JPG, PNG, atau WebP. Maksimal 5 MB.</Text><Pressable disabled={upload.isPending} onPress={chooseLogo} style={s.chooseButton}><Text style={s.chooseText}>{upload.isPending?"Mengunggah...":"Pilih logo"}</Text></Pressable></View></View>
   <View style={s.fieldsCard}>{fields.map((field,index)=><Pressable key={field.key} onPress={()=>toggle(field.key)} style={[s.fieldRow,index!==fields.length-1&&s.fieldBorder]}><Text style={s.fieldText}>{field.label}</Text><View style={[s.checkbox,values[field.key]&&s.checkboxActive]}>{values[field.key]?<Ionicons name="checkmark" size={19} color="#FFFFFF"/>:null}</View></Pressable>)}</View>
   <Text style={s.label}>Pesan footer struk</Text><TextInput value={footer} onChangeText={v=>{setFooter(v.slice(0,300));setDirty(true);}} multiline maxLength={300} textAlignVertical="top" style={s.footerInput}/><Text style={s.helper}>{footer.length}/300 karakter.</Text>
   <Pressable disabled={save.isPending||query.isLoading} onPress={()=>save.mutate({...values,footerMessage:footer.trim()||null})} style={s.saveButton}><Text style={s.saveText}>{save.isPending?"Menyimpan...":"Simpan pengaturan struk"}</Text></Pressable>
   {query.isError?<Pressable onPress={()=>query.refetch()}><Text style={s.error}>Gagal memuat pengaturan. Ketuk untuk mencoba lagi.</Text></Pressable>:null}
  </ScrollView>
  {/* [MODIFIED] Kanvas uji menggunakan komponen yang sama dengan transaksi dan cetak ulang. */}
  <View pointerEvents="none" style={{position:"absolute",left:0,top:0,opacity:0}}>
   <ReceiptPrintCanvas ref={receiptSvgRef} invoiceNumber="CONTOH-0001" createdAt={new Date()} cashierName={cashier} customerName="Pelanggan toko" orderType="Makan di tempat" paymentMethod="Tunai" subtotal={25000} discount={0} total={25000} items={[{productName:"Contoh produk",quantity:1,unitPrice:25000,subtotal:25000}]} storeName={store?.name} outletName={outlet?.name} logoUrl={logoUrl} address={outlet?.address} whatsapp={outlet?.whatsappNumber} settings={{...values,footerMessage:footer}} />
  </View>
 </SafeAreaView>
}
const createStyles=(colors:ThemeColors)=>StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.surface},header:{minHeight:68,flexDirection:"row",alignItems:"center",paddingHorizontal:14,gap:9,backgroundColor:colors.surface,borderBottomWidth:1,borderBottomColor:colors.line},headerIcon:{width:38,height:44,alignItems:"center",justifyContent:"center"},headerTitle:{fontFamily:"Archivo-Bold",fontSize:19,fontWeight:"800",color:colors.ink,letterSpacing:-.3},content:{padding:16,paddingTop:18,paddingBottom:32,gap:15},previewCard:{padding:15,borderWidth:1,borderColor:colors.line,borderRadius:17,backgroundColor:colors.surface,gap:12},eyebrow:{fontSize:12,fontWeight:"800",letterSpacing:1.2,color:colors.signal},sectionTitle:{fontSize:20,fontWeight:"800",color:colors.ink},paper:{alignSelf:"center",width:"84%",maxWidth:390,paddingHorizontal:15,paddingVertical:14,borderWidth:1,borderStyle:"dashed",borderColor:colors.lineStrong,backgroundColor:colors.surface,gap:7},paperHeader:{minHeight:76,flexDirection:"row",alignItems:"center",justifyContent:"flex-start",gap:12},paperHeaderCopy:{flex:1,gap:5,alignItems:"flex-start"},logo:{width:76,height:76,resizeMode:"contain",alignSelf:"center"},logoPlaceholder:{width:76,height:76,borderRadius:10,alignItems:"center",justifyContent:"center",backgroundColor:colors.surfaceSubtle},storeName:{fontSize:18,fontWeight:"800",color:colors.ink,textAlign:"left"},outlet:{fontSize:14,color:colors.muted,textAlign:"left"},dashed:{borderTopWidth:1,borderStyle:"dashed",borderColor:colors.lineStrong,marginVertical:8},previewLine:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",gap:10},previewLabel:{flex:1,fontSize:12,color:colors.muted},previewValue:{flex:1,fontSize:13,fontWeight:"700",color:colors.ink,textAlign:"right"},orderHeading:{fontSize:14,fontWeight:"800",textAlign:"center",color:colors.ink,marginVertical:4},quantity:{fontSize:11,color:colors.muted,textAlign:"right"},totalLabel:{fontSize:14,fontWeight:"800",color:colors.muted},totalValue:{fontSize:16,fontWeight:"900",color:colors.ink},footerDetail:{fontSize:10,color:colors.muted,textAlign:"center"},footerMessage:{fontSize:11,color:colors.ink,textAlign:"center",fontWeight:"600"},watermark:{fontSize:10,color:colors.subtle,textAlign:"center"},testButton:{minHeight:46,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10,borderRadius:12,backgroundColor:colors.signal},testButtonText:{fontSize:14,fontWeight:"800",color:colors.surface},logoCard:{flexDirection:"row",alignItems:"center",gap:13,padding:13,borderWidth:1,borderColor:colors.line,borderRadius:15,backgroundColor:colors.surface},logoThumb:{width:68,height:68,resizeMode:"contain",borderRadius:10},logoThumbPlaceholder:{width:68,height:68,alignItems:"center",justifyContent:"center",borderWidth:1,borderStyle:"dashed",borderColor:colors.line,borderRadius:10},logoTitle:{fontSize:15,fontWeight:"800",color:colors.ink},helper:{fontSize:12,color:colors.muted,lineHeight:17},chooseButton:{alignSelf:"flex-start",marginTop:5,minHeight:40,justifyContent:"center",paddingHorizontal:14,borderWidth:1,borderColor:colors.line,borderRadius:10},chooseText:{fontSize:13,fontWeight:"700",color:colors.ink},fieldsCard:{borderWidth:1,borderColor:colors.line,borderRadius:15,overflow:"hidden",backgroundColor:colors.surface},fieldRow:{minHeight:52,flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:13},fieldBorder:{borderBottomWidth:1,borderBottomColor:colors.line},fieldText:{fontSize:14,color:colors.ink},checkbox:{width:25,height:25,borderWidth:1.5,borderColor:colors.lineStrong,borderRadius:5,alignItems:"center",justifyContent:"center"},checkboxActive:{borderColor:colors.signal,backgroundColor:colors.signal},label:{fontSize:13,fontWeight:"700",color:colors.ink,marginTop:2},footerInput:{minHeight:92,padding:12,borderWidth:1,borderColor:colors.line,borderRadius:12,backgroundColor:colors.surface,fontSize:14,color:colors.ink},saveButton:{minHeight:46,alignItems:"center",justifyContent:"center",borderRadius:12,backgroundColor:colors.signal,marginTop:3},saveText:{fontSize:14,fontWeight:"800",color:colors.surface},error:{fontSize:12,color:colors.danger,textAlign:"center"}
});
