import { Order, OrderItem, User } from "@prisma/client";
import { OrderWithItems } from "./database";

export interface CustomerWithOrdersResult extends User {
  orders: OrderWithItems[];
  totalOrderAmount?: number;
}

export interface OrderSearchResult extends Order {
  name: User['wechatId'] | '';
  orderId: string;
  orderItems: OrderItem[];
  endPhone: string;
}

export interface OrderSearchResponse {
  results: OrderSearchResult[];
}