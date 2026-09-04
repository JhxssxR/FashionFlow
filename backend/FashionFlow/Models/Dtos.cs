using System.ComponentModel.DataAnnotations;

namespace FashionFlow.Models;

// ---------- Auth ----------
public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

// ---------- POS ----------
public record SaleItemRequest(
    [Range(1, int.MaxValue)] int ProductId,
    [Range(1, 999)] int Quantity);

public record CreateSaleRequest(
    int? CustomerId,
    [Required, MinLength(1)] List<SaleItemRequest> Items,
    [Required] string PaymentMethod,
    string? PromoCode);

// ---------- Inventory ----------
public record AdjustStockRequest(
    [Range(1, int.MaxValue)] int ProductId,
    [Range(0, int.MaxValue)] int NewQuantity,
    string? Note);

// ---------- Products ----------
public record SaveProductRequest(
    [Required] string Name,
    [Required] string Variant,
    [Range(0.01, 9_999_999)] decimal Price,
    decimal? OriginalPrice,
    [Range(0, int.MaxValue)] int Stock,
    [Required] string Category,
    [Required] string StorefrontCategory,
    [Required] string ImageUrl,
    bool IsNew = false);

// ---------- Purchasing ----------
public record CreatePurchaseOrderRequest(
    [Range(1, int.MaxValue)] int SupplierId,
    [Range(1, int.MaxValue)] int ProductId,
    [Range(1, 9_999)] int Quantity,
    [Range(0.01, 9_999_999)] decimal UnitCost,
    DateOnly? Eta);

public record UpdateStatusRequest([Required] string Status);

// ---------- Customers ----------
public record SaveCustomerRequest(
    [Required] string Name,
    [Required, EmailAddress] string Email);

// ---------- Loyalty ----------
public record RedeemPointsRequest(
    [Range(1, int.MaxValue)] int Points,
    string? Note);

// ---------- Promotions ----------
public record ValidatePromoRequest(
    [Required] string Code,
    [Range(0, double.MaxValue)] decimal Subtotal,
    string[]? Categories,
    string? CustomerTier);

public record SavePromotionRequest(
    [Required] string Code,
    [Required] string Description,
    [Required] string DiscountType,
    [Range(0.01, 9_999_999)] decimal DiscountValue,
    [Required] string AppliesTo,
    DateOnly ValidFrom,
    DateOnly ValidTo);

// ---------- Users (admin) ----------
public record CreateUserRequest(
    [Required] string Name,
    [Required, EmailAddress] string Email,
    [Required] string Role,
    [Required, MinLength(6)] string Password,
    bool Activate = false);

public record UpdateUserRequest(string? Name, string? Role, string? Status);

public record SaveSettingRequest([Required] string Key, [Required] string Value);
