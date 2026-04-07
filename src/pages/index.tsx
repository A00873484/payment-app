import Head from "next/head";
import OrderSearch from "@/components/OrderSearch";

export default function PublicOrderSearch() {
  return (
    <>
      <Head>
        <title>Order Search</title>
        <meta name="description" content="Search for your orders" />
      </Head>

      <OrderSearch 
        isAdminMode={false}
        placeholder="Search by WeChat ID or Name"
      />
    </>
  );
}
