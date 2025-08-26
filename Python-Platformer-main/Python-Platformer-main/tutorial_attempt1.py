import os
import random
import math 
import pygame

# Access asset files (sprites, etc.)
from os import listdir
from os.path import isfile, join 

# Initialize Pygame
pygame.init()

# Set caption for game window
pygame.display.set_caption("")

# GLOBAL VARIABLES

# Background color (white)
BG_COLOR = (255, 255, 255)

# Width and height of game window
WIDTH, HEIGHT = 900, 700

# Frames per second
FPS = 60

# Player movement speed
PLAYER_VEL = 5

# Set up game display
window = pygame.display.set_mode((WIDTH, HEIGHT))


# FUNCTIONS

def flip(sprites): 
    """Flip sprites horizontally (used for left-facing direction)."""
    return [pygame.transform.flip(sprite, True, False) for sprite in sprites]


def load_sprite_sheets(dir1, dir2, width, height, direction=False):
    """
    Load and process sprite sheets from assets folder.
    
    Args:
        dir1 (str): Parent directory.
        dir2 (str): Subdirectory.
        width (int): Width of each sprite.
        height (int): Height of each sprite.
        direction (bool): Whether to create directional variants.
        
    Returns:
        dict: Sprites keyed by action and direction.
    """
    path = join("assets", dir1, dir2)
    images = [f for f in listdir(path) if isfile(join(path, f))]

    all_sprites = {}

    for image in images:
        sprite_sheet = pygame.image.load(join(path, image)).convert_alpha()
        sprites = []
        for i in range(sprite_sheet.get_width() // width):
            surface = pygame.Surface((width, height), pygame.SRCALPHA, 32)
            rect = pygame.Rect(i * width, 0, width, height)
            surface.blit(sprite_sheet, (0, 0), rect)
            sprites.append(pygame.transform.scale2x(surface))  # Double the size

        if direction:
            all_sprites[image.replace(".png", "") + "_right"] = sprites
            all_sprites[image.replace(".png", "") + "_left"] = flip(sprites)
        else:
            all_sprites[image.replace(".png", "")] = sprites

    return all_sprites


def get_block(size):
    """
    Get a terrain block of specified size from the sprite sheet.

    Args:
        size (int): Size of the block.
    
    Returns:
        Surface: Scaled block surface.
    """
    path = join("assets", "Terrain", "Terrain.png")
    image = pygame.image.load(path).convert_alpha()
    surface = pygame.Surface((size, size), pygame.SRCALPHA, 32)
    rect = pygame.Rect(96, 0, size, size)  # Select block from sheet
    surface.blit(image, (0, 0), rect)
    return pygame.transform.scale2x(surface)


# Player class
class Player(pygame.sprite.Sprite):
    COLOR = (255, 0, 0)
    GRAVITY = 1
    TERMINAL_VELOCITY = 100
    ANIMATION_DELAY = 3
    SPRITES = load_sprite_sheets("MainCharacters", "Battling", 32, 32, True) 

    def __init__(self, x, y, width, height):
        super().__init__()
        self.rect = pygame.Rect(x, y, width, height)
        self.x_vel = 0
        self.y_vel = 0
        self.mask = None
        self.direction = "left"
        self.animation_count = 0
        self.fall_count = 0
        self.jump_count = 0

    def jump(self):
        """Handle jumping and double-jumping."""
        
        # Modify value to adjust jump height
        self.y_vel = -self.GRAVITY * 7  
        self.animation_count = 0
        self.jump_count += 1
        if self.jump_count == 1:
            self.fall_count = 0

    def move(self, dx, dy):
        """Move player by dx, dy."""
        self.rect.x += dx
        self.rect.y += dy

    def move_left(self, vel):
        """Move player to the left."""
        self.x_vel = -vel
        if self.direction != "left":
            self.direction = "left"
            self.animation_count = 0

    def move_right(self, vel):
        """Move player to the right."""
        self.x_vel = vel
        if self.direction != "right":
            self.direction = "right"
            self.animation_count = 0

    def loop(self, fps):
        """Apply gravity and update movement/animation each frame."""
        self.y_vel += self.GRAVITY * (self.fall_count / fps)
        self.y_vel = min(self.y_vel, self.TERMINAL_VELOCITY)
        self.move(self.x_vel, self.y_vel)
        self.fall_count += 1
        self.update_sprite()

    def landed(self):
        """Reset fall/jump states after landing."""
        self.fall_count = 0
        self.y_vel = 0
        self.jump_count = 0

    def hit_head(self):
        """Handle collision with block above."""
        self.count = 0
        self.y_vel *= -1

    def update_sprite(self):
        """Update the current sprite based on movement state."""
        sprite_sheet = "idle"
        if self.y_vel < 0:
            sprite_sheet = "jump" if self.jump_count == 1 else "double_jump"
        elif self.y_vel > self.GRAVITY * 2:
            sprite_sheet = "fall"
        elif self.x_vel != 0:
            sprite_sheet = "run"

        sprite_sheet_name = sprite_sheet + "_" + self.direction
        sprites = self.SPRITES[sprite_sheet_name]
        sprite_index = (self.animation_count // self.ANIMATION_DELAY) % len(sprites)
        self.sprite = sprites[sprite_index]
        self.animation_count += 1
        self.update()

    def update(self):
        """Update the sprite mask and rect position."""
        self.rect = self.sprite.get_rect(topleft=(self.rect.x, self.rect.y))
        self.mask = pygame.mask.from_surface(self.sprite)

    def draw(self, win, offset_x):
        """Draw the player on screen."""
        win.blit(self.sprite, (self.rect.x - offset_x, self.rect.y))


# Game objects
class Object(pygame.sprite.Sprite):
    def __init__(self, x, y, width, height, name=None):
        super().__init__()
        self.rect = pygame.Rect(x, y, width, height)
        self.image = pygame.Surface((width, height), pygame.SCALED)
        self.width = width
        self.height = height
        self.name = name

    def draw(self, win, offset_x):
        win.blit(self.image, (self.rect.x - offset_x, self.rect.y))


class Block(Object):
    def __init__(self, x, y, size):
        super().__init__(x, y, size, size)
        block = get_block(size)
        self.image.blit(block, (0, 0))
        self.mask = pygame.mask.from_surface(self.image)

class Fire(Object):  
    ANIMATION_DELAY = 3

    
    def __init__(self, x, y, size):
        super().__init__(x, y, size, size)
        self.fire = load_sprite_sheets("Traps", "Fire", width, height)
        self.image = self.fire["off"][0]  # Default to right-facing fire
        self.mask = pygame.mask.from_surface(self.image)
        self.animation_count = 0
        self.animation_name = "off"

def on(self):
    self.animation_name = "on"

def off(self):
    self.animation_name = "off"


def loop(self):
    sprites = self.fire[self.animation_name]
    sprite_index = (self.animation_count //
                    self.ANIMATION_DELAY) % len(sprites)
    self.image = sprites[sprite_index]
    self.animation_count += 1

    self.rect = self.image.get_rect(topleft=(self.rect.x, self.rect.y))
    self.mask = pygame.mask.from_surface(self.image)

    if self.animation_count // self.ANIMATION_DELAY > len(sprites):
        self.animation_count = 0

def get_background(name):
    """
    Load and tile background image.

    Returns:
        tuple: List of tile positions, background image surface.
    """
    image = pygame.image.load(join("assets", "Background", name))
    _, _, width, height = image.get_rect()
    tiles = []
    for i in range(WIDTH // width + 1):
        for j in range(HEIGHT // height + 1):
            tiles.append((i * width, j * height))
    return tiles, image


def draw(window, background, bg_image, player, objects, offset_x):
    """Draw everything to the screen."""
    for tile in background:
        window.blit(bg_image, tile)
    for obj in objects:
        obj.draw(window, offset_x)
    player.draw(window, offset_x)
    pygame.display.update()


def handle_vertical_collision(player, objects, dy):
    """Handle vertical collisions (jumping, falling)."""
    collided_objects = []
    for obj in objects:
        if pygame.sprite.collide_mask(player, obj):
            if dy > 0:
                player.rect.bottom = obj.rect.top
                player.landed()
            elif dy < 0:
                player.rect.top = obj.rect.bottom
                player.hit_head()
            collided_objects.append(obj)
    return collided_objects


def collide(player, objects, dx):
    """Check horizontal collisions before committing movement."""
    player.move(dx, 0)
    player.update()
    collided_object = None
    for obj in objects:
        if pygame.sprite.collide_mask(player, obj):
            collided_object = obj
            break
    player.move(-dx, 0)
    player.update()
    return collided_object


def handle_move(player, objects):
    """Handle player input and movement."""
    keys = pygame.key.get_pressed()
    player.x_vel = 0
    collide_left = collide(player, objects, -PLAYER_VEL * 1.75)
    collide_right = collide(player, objects, PLAYER_VEL * 1.75)

    if keys[pygame.K_LEFT] and not collide_left:
        player.move_left(PLAYER_VEL)
    if keys[pygame.K_RIGHT] and not collide_right:
        player.move_right(PLAYER_VEL)

    collided_objects = handle_vertical_collision(player, objects, player.y_vel)
    if collided_objects:
        player.y_vel = 0


def main(window):
    """Main game loop."""
    clock = pygame.time.Clock()
    background, bg_image = get_background("Purple.png")
    player = Player(100, 100, 50, 50)

    block_size = 96

    floor = [Block(i * block_size, HEIGHT - block_size, block_size) for i in range(-WIDTH // block_size, (WIDTH * 2) // block_size)]
    
    #To change the block positions modify the multiplication see the second
    object = [*floor, Block(0, HEIGHT - block_size * 2, block_size),
              Block(block_size * -4.7, HEIGHT - block_size * 2.6, block_size)]


    offset_x = 0
    scroll_area_width = 200
    run = True

    while run:
        clock.tick(FPS)
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                run = False
                break
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_UP and player.jump_count < 2:
                    player.jump()

        player.loop(FPS)
        handle_move(player, object)
        draw(window, background, bg_image, player, object, offset_x)

        if ((player.rect.right - offset_x >= WIDTH - scroll_area_width) and player.x_vel > 0) or (
            (player.rect.left - offset_x <= scroll_area_width) and player.x_vel < 0):
            offset_x += player.x_vel

    pygame.quit()
    quit()


if __name__ == "__main__":
    main(window)
